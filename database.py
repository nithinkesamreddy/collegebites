
import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    """Connect to the CampusBite MariaDB database."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "campusbite_db"),
        user=os.getenv("DB_USER", "campusbite_user"),
        password=os.getenv("DB_PASSWORD", ""),
    )
