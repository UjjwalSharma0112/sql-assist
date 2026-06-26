from unittest.mock import patch

def test_project_crud(client):
    # 1. Signup & Signin user
    client.post("/api/v1/auth/signup", json={
        "username": "projuser",
        "email": "proj@example.com",
        "password": "password"
    })
    signin_res = client.post("/api/v1/auth/signin", json={
        "email": "proj@example.com",
        "password": "password"
    })
    token = signin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    mock_schema_json = {
        "tables": [
            {
                "name": "customers",
                "columns": [
                    {"name": "id", "type": "INTEGER", "primary_key": True, "nullable": False},
                    {"name": "name", "type": "VARCHAR", "primary_key": False, "nullable": True}
                ],
                "foreign_keys": []
            }
        ]
    }
    mock_schema_summary = "customers(\n  id PK,\n  name\n)"
    mock_relationship_summary = "No relationships defined."

    with patch("app.services.project_service.test_db_connection", return_value=True), \
         patch("app.services.project_service.extract_db_schema", return_value=(mock_schema_json, mock_schema_summary, mock_relationship_summary)):
        
        # 2. Create project
        response = client.post("/api/v1/projects", json={
            "name": "Test Postgres DB",
            "db_type": "postgres",
            "host": "localhost",
            "port": 5432,
            "database_name": "postgres_db",
            "username": "dbuser",
            "password": "dbpassword"
        }, headers=headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Postgres DB"
        assert data["db_username"] == "dbuser"
        assert data["schema_summary"] == mock_schema_summary
        project_id = data["id"]

        # 3. List projects
        list_res = client.get("/api/v1/projects", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1
        assert list_res.json()[0]["id"] == project_id

        # 4. Get project details
        detail_res = client.get(f"/api/v1/projects/{project_id}", headers=headers)
        assert detail_res.status_code == 200
        assert detail_res.json()["name"] == "Test Postgres DB"

        # 5. Delete project
        del_res = client.delete(f"/api/v1/projects/{project_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["message"] == "Project deleted successfully"

        # 6. Check list is empty
        list_res2 = client.get("/api/v1/projects", headers=headers)
        assert len(list_res2.json()) == 0
