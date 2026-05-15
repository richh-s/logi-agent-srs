import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    """
    Returns a Firestore client, initializing the Firebase Admin SDK on first call.
    Uses Application Default Credentials (ADC) on Cloud Run.
    For local development, set GOOGLE_APPLICATION_CREDENTIALS in your .env
    to point to your service account key JSON file.
    """
    global _db
    if _db is None:
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        _db = firestore.client()
    return _db
