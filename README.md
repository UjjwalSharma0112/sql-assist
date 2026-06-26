# SQL Assist

An AI-powered Natural Language to SQL assistant. SQL Assist translates natural language questions into precise, optimized SQL queries, analyzes security risks, generates explanations, and executes them against your database.

---

## Architecture Overview

The project consists of two main components:
1. **Backend**: Built with Python, FastAPI, and SQLAlchemy. It uses Google Gemini to translate questions to SQL, uses SQLGlot to check safety, and connects to target databases (PostgreSQL or MySQL) to execute queries.
2. **Frontend**: Built with React, Next.js (App Router), Tailwind CSS, and Shadcn/UI.

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Python](https://www.python.org/) (v3.13 or higher)
* [uv](https://github.com/astral-sh/uv) (fast Python package installer and manager)

---

### 1. Backend Setup & Run

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and set the following values:
   * `SECRET_KEY`: A secure random string for signing JWT tokens.
   * `GEMINI_API_KEY`: Your Google Gemini API key.
   * `DATABASE_URL`: The SQLite database location (e.g., `sqlite:///data/users.db`).

3. Install dependencies and start the FastAPI server:
   ```bash
   uv sync
   uv run uvicorn app.main:app --reload
   ```
   The backend API will run at `http://localhost:8000`.

4. **Running Tests**:
   To run the test suite:
   ```bash
   uv run python -m pytest
   ```

---

### 2. Frontend Setup & Run

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend application will run at `http://localhost:3000`.

4. **Type Checking & Linting**:
   To verify code types:
   ```bash
   npm run typecheck
   ```

---

## How It Works

1. **Connect Database**: Add your database credentials (PostgreSQL or MySQL) in the UI. SQL Assist will securely test the connection and extract your schema metadata (tables, columns, primary/foreign keys).
2. **Ask in Plain English**: Type your question in the playground (e.g., *"Find all users who registered last week and spent more than $100"*).
3. **AI Generation & Safety Assessment**:
   * Gemini generates a primary SQL query and multiple optimized alternatives.
   * The SQL syntax and structure are checked via **SQLGlot** to prevent dangerous actions (like unconstrained `UPDATE`/`DELETE` or DDL operations).
4. **Execution & Results**: Run the query inside a transactional session with automatic timeout and safety rollbacks. Download the final results as a CSV or Excel spreadsheet.
