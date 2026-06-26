def test_auth_flow(client):
    # 1. Signup user
    response = client.post("/api/v1/auth/signup", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "strongpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert "access_token" in data
    
    token = data["access_token"]

    # 2. Try signup again with same email -> conflict
    response = client.post("/api/v1/auth/signup", json={
        "username": "testuser2",
        "email": "test@example.com",
        "password": "anotherpassword"
    })
    assert response.status_code == 409
    assert response.json()["detail"] == "Email already registered"

    # 3. Signin user
    response = client.post("/api/v1/auth/signin", json={
        "email": "test@example.com",
        "password": "strongpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert "access_token" in data

    # 4. Signin with invalid credentials
    response = client.post("/api/v1/auth/signin", json={
        "email": "test@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

    # 5. Access profile via /auth/me
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "test@example.com"
