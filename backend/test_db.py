from app.db import firestore
try:
    firestore.get_active_shipments()
    print("Firebase works!")
except Exception as e:
    print(f"Firebase failed: {e}")
