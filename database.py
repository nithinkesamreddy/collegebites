import os

import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    """Connect to the CollegeBites MySQL database."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "collegebites"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
    )
