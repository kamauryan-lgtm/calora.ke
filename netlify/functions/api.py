"""
CALORA - Netlify Serverless API Function
Wraps the FastAPI app using Mangum to run on AWS Lambda / Netlify Functions.
"""
import sys
import os

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Flag environment for serverless /tmp database handling
os.environ["NETLIFY"] = "true"

from mangum import Mangum
from app.main import app

# Handler called by Netlify / AWS Lambda
handler = Mangum(app, lifespan="off")
