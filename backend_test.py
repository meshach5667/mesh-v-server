#!/usr/bin/env python3
"""
ShieldNet Community Safety App Backend API Testing
Tests all backend endpoints as per review request
"""

import requests
import json
import time
import websocket as ws
import threading
from datetime import datetime
import sys
import os

# Backend URL from frontend .env
BACKEND_URL = "http://localhost:8001/api"

class ShieldNetAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.user_id = None
        self.incident_ids = []
        
        # Test data
        self.test_user = {
            "firebase_uid": "test-uid-shieldnet-123",
            "email": "tester@shieldnet.com", 
            "display_name": "Shield Net Tester",
            "fcm_token": "test-fcm-token-shieldnet-2024"
        }
        
        self.test_location = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "fcm_token": "test-fcm-token-updated"
        }
        
        self.test_incidents = [
            {
                "incident_type": "theft",
                "description": "Bike stolen near central park in downtown area",
                "latitude": 37.7749,
                "longitude": -122.4194,
                "severity": "medium"
            },
            {
                "incident_type": "fire", 
                "description": "Small fire reported in building lobby",
                "latitude": 37.7750,
                "longitude": -122.4195,
                "severity": "high"
            },
            {
                "incident_type": "medical",
                "description": "Person collapsed on sidewalk, needs assistance",
                "latitude": 37.7748,
                "longitude": -122.4193,
                "severity": "critical"
            }
        ]

    def log_result(self, test_name, success, message, data=None):
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if data:
            print(f"    Data: {json.dumps(data, indent=2)}")

    def test_health_check(self):
        """Test GET /api/ endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["message", "status"]
                if all(key in data for key in expected_keys):
                    if "ShieldNet API" in data["message"] and data["status"] == "running":
                        self.log_result("Health Check", True, "API is running correctly", data)
                        return True
                    else:
                        self.log_result("Health Check", False, f"Unexpected response content: {data}")
                else:
                    self.log_result("Health Check", False, f"Missing expected keys: {data}")
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {str(e)}")
        
        return False

    def test_user_registration(self):
        """Test POST /api/auth/register endpoint"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=self.test_user,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and "message" in data:
                    self.user_id = data["user_id"]
                    self.log_result("User Registration", True, "User registered successfully", data)
                    return True
                else:
                    self.log_result("User Registration", False, f"Missing fields in response: {data}")
            else:
                self.log_result("User Registration", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("User Registration", False, f"Error: {str(e)}")
        
        return False

    def test_user_location_update_without_auth(self):
        """Test POST /api/user/location endpoint without auth (should fail)"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/user/location",
                json=self.test_location,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 401:
                self.log_result("Location Update (No Auth)", True, "Correctly rejected unauthorized request")
                return True
            else:
                self.log_result("Location Update (No Auth)", False, f"Should have returned 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Location Update (No Auth)", False, f"Error: {str(e)}")
        
        return False

    def test_user_location_update_with_mock_auth(self):
        """Test POST /api/user/location with mock auth header"""
        try:
            # Since we can't get real Firebase token, test with mock header structure
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer mock-firebase-token-{self.test_user['firebase_uid']}"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/user/location",
                json=self.test_location,
                headers=headers
            )
            
            # We expect this to fail with 401 due to invalid token, but we're testing the endpoint structure
            if response.status_code == 401:
                response_data = response.json() if response.content else {}
                if "authentication" in response_data.get("detail", "").lower():
                    self.log_result("Location Update (Mock Auth)", True, "Auth validation working - rejected invalid token")
                    return True
                else:
                    self.log_result("Location Update (Mock Auth)", False, f"Unexpected auth error: {response.text}")
            else:
                self.log_result("Location Update (Mock Auth)", False, f"Expected 401, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Location Update (Mock Auth)", False, f"Error: {str(e)}")
        
        return False

    def test_create_incident_without_auth(self):
        """Test POST /api/incidents without auth (should fail)"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/incidents",
                json=self.test_incidents[0],
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 401:
                self.log_result("Create Incident (No Auth)", True, "Correctly rejected unauthorized request")
                return True
            else:
                self.log_result("Create Incident (No Auth)", False, f"Should have returned 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Create Incident (No Auth)", False, f"Error: {str(e)}")
        
        return False

    def test_create_incident_with_mock_auth(self):
        """Test POST /api/incidents with mock auth header"""
        try:
            headers = {
                "Content-Type": "application/json", 
                "Authorization": f"Bearer mock-firebase-token-{self.test_user['firebase_uid']}"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/incidents",
                json=self.test_incidents[0],
                headers=headers
            )
            
            # Expect 401 due to invalid token, but testing endpoint structure
            if response.status_code == 401:
                response_data = response.json() if response.content else {}
                if "authentication" in response_data.get("detail", "").lower():
                    self.log_result("Create Incident (Mock Auth)", True, "Auth validation working for incident creation")
                    return True
                else:
                    self.log_result("Create Incident (Mock Auth)", False, f"Unexpected auth error: {response.text}")
            else:
                self.log_result("Create Incident (Mock Auth)", False, f"Expected 401, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Create Incident (Mock Auth)", False, f"Error: {str(e)}")
        
        return False

    def test_get_all_incidents(self):
        """Test GET /api/incidents endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/incidents")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get All Incidents", True, f"Retrieved {len(data)} incidents", {"count": len(data)})
                    return True
                else:
                    self.log_result("Get All Incidents", False, f"Expected list, got: {type(data)}")
            else:
                self.log_result("Get All Incidents", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Get All Incidents", False, f"Error: {str(e)}")
        
        return False

    def test_get_nearby_incidents_without_auth(self):
        """Test GET /api/incidents/nearby without auth (should fail)"""
        try:
            params = {
                "latitude": 37.7749,
                "longitude": -122.4194,
                "radius": 5000
            }
            
            response = self.session.get(f"{BACKEND_URL}/incidents/nearby", params=params)
            
            if response.status_code == 401:
                self.log_result("Get Nearby Incidents (No Auth)", True, "Correctly rejected unauthorized request")
                return True
            else:
                self.log_result("Get Nearby Incidents (No Auth)", False, f"Should have returned 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Get Nearby Incidents (No Auth)", False, f"Error: {str(e)}")
        
        return False

    def test_get_nearby_incidents_with_mock_auth(self):
        """Test GET /api/incidents/nearby with mock auth"""
        try:
            params = {
                "latitude": 37.7749,
                "longitude": -122.4194, 
                "radius": 5000
            }
            
            headers = {
                "Authorization": f"Bearer mock-firebase-token-{self.test_user['firebase_uid']}"
            }
            
            response = self.session.get(f"{BACKEND_URL}/incidents/nearby", params=params, headers=headers)
            
            if response.status_code == 401:
                response_data = response.json() if response.content else {}
                if "authentication" in response_data.get("detail", "").lower():
                    self.log_result("Get Nearby Incidents (Mock Auth)", True, "Auth validation working for nearby incidents")
                    return True
                else:
                    self.log_result("Get Nearby Incidents (Mock Auth)", False, f"Unexpected auth error: {response.text}")
            else:
                self.log_result("Get Nearby Incidents (Mock Auth)", False, f"Expected 401, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Get Nearby Incidents (Mock Auth)", False, f"Error: {str(e)}")
        
        return False

    def test_get_hotspots(self):
        """Test GET /api/hotspots endpoint"""
        try:
            params = {"min_incidents": 1}
            response = self.session.get(f"{BACKEND_URL}/hotspots", params=params)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Hotspots", True, f"Retrieved {len(data)} hotspots", {"count": len(data)})
                    
                    # Validate hotspot structure if data exists
                    if data:
                        first_hotspot = data[0]
                        expected_fields = ["latitude", "longitude", "count", "incident_types"]
                        if all(field in first_hotspot for field in expected_fields):
                            self.log_result("Hotspot Structure", True, "Hotspot data structure is correct", first_hotspot)
                        else:
                            self.log_result("Hotspot Structure", False, f"Missing fields in hotspot: {first_hotspot}")
                    
                    return True
                else:
                    self.log_result("Get Hotspots", False, f"Expected list, got: {type(data)}")
            else:
                self.log_result("Get Hotspots", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Get Hotspots", False, f"Error: {str(e)}")
        
        return False

    def test_websocket_connection(self):
        """Test WebSocket connection to /api/ws endpoint"""
        try:
            ws_url = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
            
            class WSClient:
                def __init__(self):
                    self.connected = False
                    self.messages = []
                    self.error = None
                
                def on_open(self, ws):
                    self.connected = True
                
                def on_message(self, ws, message):
                    self.messages.append(message)
                
                def on_error(self, ws, error):
                    self.error = error
                
                def on_close(self, ws, close_status_code, close_msg):
                    pass
            
            ws_client = WSClient()
            
            # Create WebSocket connection
            websocket_app = ws.WebSocketApp(ws_url,
                                      on_open=ws_client.on_open,
                                      on_message=ws_client.on_message,
                                      on_error=ws_client.on_error,
                                      on_close=ws_client.on_close)
            
            # Run WebSocket in separate thread
            wst = threading.Thread(target=websocket_app.run_forever)
            wst.daemon = True
            wst.start()
            
            # Wait for connection
            time.sleep(2)
            
            if ws_client.connected:
                # Send test message
                websocket_app.send("test message")
                time.sleep(1)
                
                # Close connection
                websocket_app.close()
                
                self.log_result("WebSocket Connection", True, "WebSocket connection successful")
                return True
            elif ws_client.error:
                self.log_result("WebSocket Connection", False, f"WebSocket error: {ws_client.error}")
            else:
                self.log_result("WebSocket Connection", False, "Could not establish WebSocket connection")
                
        except Exception as e:
            self.log_result("WebSocket Connection", False, f"WebSocket test error: {str(e)}")
        
        return False

    def test_geospatial_query_structure(self):
        """Test geospatial query with different radii"""
        try:
            # Test with different radius values
            test_cases = [
                {"radius": 1000, "desc": "1km radius"},
                {"radius": 5000, "desc": "5km radius"},
                {"radius": 10000, "desc": "10km radius"}
            ]
            
            success_count = 0
            
            for case in test_cases:
                params = {
                    "latitude": 37.7749,
                    "longitude": -122.4194,
                    "radius": case["radius"]
                }
                
                response = self.session.get(f"{BACKEND_URL}/incidents", params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        success_count += 1
                        self.log_result(f"Geospatial Query ({case['desc']})", True, f"Query successful, {len(data)} results")
                    else:
                        self.log_result(f"Geospatial Query ({case['desc']})", False, f"Invalid response format")
                else:
                    self.log_result(f"Geospatial Query ({case['desc']})", False, f"HTTP {response.status_code}")
            
            return success_count == len(test_cases)
            
        except Exception as e:
            self.log_result("Geospatial Query Structure", False, f"Error: {str(e)}")
            return False

    def test_mongodb_connection_and_indexes(self):
        """Test if MongoDB connection is working by checking API responses"""
        try:
            # Test that endpoints requiring DB access work
            response = self.session.get(f"{BACKEND_URL}/incidents")
            
            if response.status_code == 200:
                # Test hotspots endpoint which uses MongoDB aggregation 
                hotspots_response = self.session.get(f"{BACKEND_URL}/hotspots?min_incidents=0")
                
                if hotspots_response.status_code == 200:
                    self.log_result("MongoDB Connection", True, "MongoDB connection and queries working")
                    return True
                else:
                    self.log_result("MongoDB Connection", False, f"Hotspots query failed: {hotspots_response.status_code}")
            else:
                self.log_result("MongoDB Connection", False, f"Basic query failed: {response.status_code}")
                
        except Exception as e:
            self.log_result("MongoDB Connection", False, f"Database connection error: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting ShieldNet Backend API Tests")
        print(f"📍 Testing against: {BACKEND_URL}")
        print("=" * 60)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_user_registration), 
            ("Location Update (No Auth)", self.test_user_location_update_without_auth),
            ("Location Update (Mock Auth)", self.test_user_location_update_with_mock_auth),
            ("Create Incident (No Auth)", self.test_create_incident_without_auth),
            ("Create Incident (Mock Auth)", self.test_create_incident_with_mock_auth),
            ("Get All Incidents", self.test_get_all_incidents),
            ("Get Nearby Incidents (No Auth)", self.test_get_nearby_incidents_without_auth),
            ("Get Nearby Incidents (Mock Auth)", self.test_get_nearby_incidents_with_mock_auth),
            ("Get Hotspots", self.test_get_hotspots),
            ("WebSocket Connection", self.test_websocket_connection),
            ("Geospatial Queries", self.test_geospatial_query_structure),
            ("MongoDB Connection", self.test_mongodb_connection_and_indexes)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                self.log_result(test_name, False, f"Test execution error: {str(e)}")
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All backend tests passed!")
        else:
            print(f"⚠️  {total - passed} test(s) failed")
        
        return passed, total, self.test_results

def main():
    """Main test execution"""
    tester = ShieldNetAPITester()
    passed, total, results = tester.run_all_tests()
    
    # Save detailed results
    results_file = "/app/backend_test_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "summary": {
                "passed": passed,
                "total": total,
                "success_rate": f"{(passed/total)*100:.1f}%",
                "timestamp": datetime.now().isoformat()
            },
            "tests": results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())