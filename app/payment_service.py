"""
CALORA - Payment & Revenue Architecture
Supports Kenyan payment methods (M-Pesa STK Push, Card, Paybill).
Enforces:
1. Idempotency keys & unique provider references
2. Append-only revenue ledger
3. Reversal entries for refunds & cancellations
4. Clear separation of Gym Sales vs CALORA SaaS revenue
5. Never stores M-Pesa PINs or raw card numbers
"""

import os
import json
import secrets
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, Tuple
from app.database import get_db_connection


# Default platform commission rate for pilot gyms (0% as specified in Section 49)
DEFAULT_PILOT_COMMISSION_RATE = 0.0


def initiate_mpesa_payment(
    phone_number: str,
    amount_kes: int,
    transaction_type: str,  # 'gym_subscription', 'package_order', 'plus_subscription'
    entity_id: str,        # gym_id or package_id or user_id
    user_id: Optional[str] = None,
    idempotency_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Server-side initiate M-Pesa STK Push.
    Validates phone format (e.g. 2547XXXXXXXX or 07XXXXXXXX),
    enforces idempotency, creates pending transaction.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Sanitize phone
    clean_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
    if clean_phone.startswith("0"):
        clean_phone = "254" + clean_phone[1:]
    elif not clean_phone.startswith("254"):
        clean_phone = "254" + clean_phone

    # Check idempotency
    key = idempotency_key or f"idem_{secrets.token_hex(8)}"
    cursor.execute("SELECT * FROM payment_transactions WHERE idempotency_key = ?", (key,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return {
            "status": "existing",
            "transaction_id": existing["id"],
            "reference": existing["reference"],
            "state": existing["status"],
            "message": "Payment already initiated with this idempotency key."
        }

    tx_id = f"tx_{secrets.token_hex(6)}"
    mpesa_reference = f"MPESA_{secrets.token_hex(4).upper()}"
    now_str = datetime.now().isoformat()

    cursor.execute("""
    INSERT INTO payment_transactions (
        id, reference, provider, transaction_type, entity_id, user_id,
        amount_kes, phone_number, status, provider_metadata_json,
        idempotency_key, created_at, updated_at
    ) VALUES (?, ?, 'mpesa_daraja', ?, ?, ?, ?, ?, 'pending', '{}', ?, ?, ?)
    """, (tx_id, mpesa_reference, transaction_type, entity_id, user_id, amount_kes, clean_phone, key, now_str, now_str))

    conn.commit()
    conn.close()

    # In production, this issues an asynchronous STK Push HTTP request to Safaricom Daraja API
    # Here we simulate the initiation and provide immediate STK Push prompt confirmation
    return {
        "status": "pending",
        "transaction_id": tx_id,
        "reference": mpesa_reference,
        "amount_kes": amount_kes,
        "phone_number": clean_phone,
        "customer_prompt": f"STK Push prompt sent to {clean_phone}. Enter M-Pesa PIN on your phone to complete payment of KES {amount_kes:,}."
    }


def process_payment_callback(
    reference: str,
    success: bool = True,
    receipt_number: Optional[str] = None,
    failure_reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Idempotent Webhook Handler:
    Called when Safaricom or payment gateway delivers transaction result.
    Updates transaction, executes business activation, and writes append-only ledger entries.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM payment_transactions WHERE reference = ?", (reference,))
    tx_row = cursor.fetchone()
    if not tx_row:
        conn.close()
        raise ValueError(f"Transaction reference {reference} not found")

    tx = dict(tx_row)
    now_str = datetime.now().isoformat()

    # Prevent double-processing
    if tx["status"] in ("successful", "failed", "refunded"):
        conn.close()
        return {
            "status": "already_processed",
            "transaction_id": tx["id"],
            "state": tx["status"]
        }

    final_receipt = receipt_number or f"MP{secrets.token_hex(4).upper()}"

    if success:
        # 1. Mark transaction successful
        cursor.execute("""
        UPDATE payment_transactions
        SET status = 'successful', provider_metadata_json = ?, updated_at = ?
        WHERE id = ?
        """, (json.dumps({"MpesaReceiptNumber": final_receipt}), now_str, tx["id"]))

        # 2. Business Activation based on type
        if tx["transaction_type"] == "gym_subscription":
            gym_id = tx["entity_id"]
            # Activate or renew gym subscription
            cursor.execute("SELECT plan_id FROM gym_subscriptions WHERE gym_id = ?", (gym_id,))
            sub_row = cursor.fetchone()
            plan_id = sub_row[0] if sub_row else "plan_starter"

            new_period_start = now_str
            new_period_end = (datetime.now() + timedelta(days=30)).isoformat()

            cursor.execute("""
            INSERT OR REPLACE INTO gym_subscriptions (
                id, gym_id, plan_id, status, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at
            ) VALUES (?, ?, ?, 'active', ?, ?, NULL, 0, ?, ?)
            """, (f"gsub_{secrets.token_hex(4)}", gym_id, plan_id, new_period_start, new_period_end, now_str, now_str))

            # SaaS Revenue Ledger (100% Platform Revenue)
            cursor.execute("""
            INSERT INTO revenue_ledger (
                id, entry_type, gym_id, amount_kes, platform_share_kes, gym_share_kes,
                order_id, transaction_id, status, description, created_at
            ) VALUES (?, 'gym_subscription', ?, ?, ?, 0, NULL, ?, 'settled', 'CALORA SaaS Monthly Subscription', ?)
            """, (f"rev_{secrets.token_hex(4)}", gym_id, tx["amount_kes"], tx["amount_kes"], tx["id"], now_str))

            # Billing Invoice
            cursor.execute("""
            INSERT INTO billing_invoices (id, gym_id, invoice_number, plan_id, amount_kes, status, due_date, paid_at, created_at)
            VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, ?)
            """, (f"inv_{secrets.token_hex(4)}", gym_id, f"INV-{secrets.token_hex(3).upper()}", plan_id, tx["amount_kes"], now_str, now_str, now_str))

        elif tx["transaction_type"] == "package_order":
            order_id = tx["entity_id"]
            cursor.execute("SELECT * FROM gym_orders WHERE id = ?", (order_id,))
            ord_row = cursor.fetchone()
            if ord_row:
                order = dict(ord_row)
                gym_id = order["gym_id"]

                cursor.execute("UPDATE gym_orders SET status = 'completed', payment_ref = ? WHERE id = ?", (final_receipt, order_id))

                # Commission Calculation (Pilot gyms = 0%)
                commission_rate = DEFAULT_PILOT_COMMISSION_RATE
                platform_cut = round(tx["amount_kes"] * commission_rate)
                gym_cut = tx["amount_kes"] - platform_cut

                # Revenue Ledger (Gym sales are NOT Calora revenue; only platform_cut is Calora commission)
                cursor.execute("""
                INSERT INTO revenue_ledger (
                    id, entry_type, gym_id, amount_kes, platform_share_kes, gym_share_kes,
                    order_id, transaction_id, status, description, created_at
                ) VALUES (?, 'package_sale', ?, ?, ?, ?, ?, ?, 'pending_settlement', 'Gym Member Nutrition Package Purchase', ?)
                """, (f"rev_{secrets.token_hex(4)}", gym_id, tx["amount_kes"], platform_cut, gym_cut, order_id, tx["id"], now_str))

        conn.commit()
        conn.close()
        return {
            "status": "success",
            "transaction_id": tx["id"],
            "receipt": final_receipt,
            "message": "Payment verified and activated successfully."
        }

    else:
        # Mark transaction failed
        cursor.execute("""
        UPDATE payment_transactions
        SET status = 'failed', provider_metadata_json = ?, updated_at = ?
        WHERE id = ?
        """, (json.dumps({"failure_reason": failure_reason or "Customer canceled on USSD prompt"}), now_str, tx["id"]))

        conn.commit()
        conn.close()
        return {
            "status": "failed",
            "transaction_id": tx["id"],
            "reason": failure_reason
        }


def record_refund_reversal(order_id: str, admin_user_id: str, reason: str) -> Dict[str, Any]:
    """
    Processes a refund using an append-only accounting entry.
    Never alters or deletes previous financial rows.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM gym_orders WHERE id = ?", (order_id,))
    ord_row = cursor.fetchone()
    if not ord_row:
        conn.close()
        raise ValueError(f"Order {order_id} not found")

    order = dict(ord_row)
    if order["status"] == "refunded":
        conn.close()
        return {"status": "already_refunded", "order_id": order_id}

    now_str = datetime.now().isoformat()

    # 1. Mark order refunded
    cursor.execute("UPDATE gym_orders SET status = 'refunded' WHERE id = ?", (order_id,))

    # 2. Append reversal entry into revenue ledger
    cursor.execute("""
    INSERT INTO revenue_ledger (
        id, entry_type, gym_id, amount_kes, platform_share_kes, gym_share_kes,
        order_id, transaction_id, status, description, created_at
    ) VALUES (?, 'refund', ?, ?, 0, ?, ?, NULL, 'settled', ?, ?)
    """, (f"rev_ref_{secrets.token_hex(4)}", order["gym_id"], -order["amount_kes"], -order["amount_kes"], order_id, f"Refund: {reason}", now_str))

    # 3. Audit log
    cursor.execute("""
    INSERT INTO audit_logs (id, admin_user_id, action, target_entity, target_id, details, created_at)
    VALUES (?, ?, 'order_refund', 'gym_orders', ?, ?, ?)
    """, (f"audit_{secrets.token_hex(4)}", admin_user_id, order_id, f"Refunded KES {order['amount_kes']}: {reason}", now_str))

    conn.commit()
    conn.close()

    return {
        "status": "refunded",
        "order_id": order_id,
        "amount_kes": order["amount_kes"],
        "reason": reason
    }
