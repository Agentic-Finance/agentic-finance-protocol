import sqlite3
import os

# Database configuration
DB_NAME = "paypol_data.db"

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    # Ensure we are in the correct directory (src)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, DB_NAME)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Access columns by name
    return conn

def init_db():
    """Creates the necessary tables if they don't exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create 'employees' table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            wallet_address TEXT NOT NULL,
            salary_eth REAL NOT NULL,
            role TEXT DEFAULT 'Staff'
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully.")

def add_employee(name, wallet_address, salary_eth, role="Staff"):
    """Adds a new employee to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO employees (name, wallet_address, salary_eth, role) VALUES (?, ?, ?, ?)",
        (name, wallet_address, salary_eth, role)
    )
    
    conn.commit()
    conn.close()
    return True

def get_all_employees():
    """Retrieves all employees."""
    conn = get_db_connection()
    employees = conn.execute("SELECT * FROM employees").fetchall()
    conn.close()
    
    # Convert row objects to dictionary list
    return [dict(row) for row in employees]

# Initialize the DB when this file is imported
if __name__ == "__main__":
    init_db()