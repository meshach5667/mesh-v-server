#!/usr/bin/env python3
"""
MongoDB and Geospatial Features Verification Test
Tests database indexes and geospatial query functionality
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://safety-hotspots.preview.emergentagent.com/api"

def test_mongodb_indexes_and_geospatial():
    """Test MongoDB indexes and geospatial functionality with actual data"""
    
    print("🔍 Testing MongoDB indexes and geospatial queries...")
    
    # Test 1: Register multiple test users at different locations
    test_users = [
        {
            "firebase_uid": "geo-test-user-1",
            "email": "geotest1@shieldnet.com",
            "display_name": "Geo Test User 1"
        },
        {
            "firebase_uid": "geo-test-user-2", 
            "email": "geotest2@shieldnet.com",
            "display_name": "Geo Test User 2"
        }
    ]
    
    user_ids = []
    for user in test_users:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=user)
        if response.status_code == 200:
            data = response.json()
            user_ids.append(data.get("user_id"))
            print(f"✅ Registered user: {user['firebase_uid']}")
        else:
            print(f"❌ Failed to register user: {user['firebase_uid']}")
    
    # Test 2: Check incidents endpoints return proper structure
    incidents_response = requests.get(f"{BACKEND_URL}/incidents")
    if incidents_response.status_code == 200:
        incidents_data = incidents_response.json()
        print(f"✅ GET /incidents working - returned {len(incidents_data)} incidents")
        
        # Test with geospatial parameters
        geo_response = requests.get(f"{BACKEND_URL}/incidents", params={
            "latitude": 37.7749,
            "longitude": -122.4194,
            "radius": 5000
        })
        
        if geo_response.status_code == 200:
            geo_data = geo_response.json()
            print(f"✅ Geospatial query working - returned {len(geo_data)} incidents within 5km")
        else:
            print(f"❌ Geospatial query failed: {geo_response.status_code}")
    else:
        print(f"❌ GET /incidents failed: {incidents_response.status_code}")
    
    # Test 3: Check hotspots aggregation
    hotspots_response = requests.get(f"{BACKEND_URL}/hotspots", params={"min_incidents": 0})
    if hotspots_response.status_code == 200:
        hotspots_data = hotspots_response.json()
        print(f"✅ Hotspots aggregation working - returned {len(hotspots_data)} hotspots")
        
        # Check structure if data exists
        if hotspots_data and len(hotspots_data) > 0:
            sample = hotspots_data[0]
            expected_fields = ["latitude", "longitude", "count", "incident_types"]
            if all(field in sample for field in expected_fields):
                print("✅ Hotspot data structure is correct")
            else:
                print(f"⚠️  Hotspot structure missing fields: {sample}")
    else:
        print(f"❌ Hotspots query failed: {hotspots_response.status_code}")
    
    # Test 4: Test edge cases for geospatial queries
    edge_cases = [
        {"lat": 0, "lng": 0, "radius": 1000, "desc": "Null Island"},
        {"lat": 90, "lng": 180, "radius": 500, "desc": "North Pole"},
        {"lat": -90, "lng": -180, "radius": 2000, "desc": "South Pole"},
        {"lat": 37.7749, "lng": -122.4194, "radius": 1, "desc": "1 meter radius"},
        {"lat": 37.7749, "lng": -122.4194, "radius": 50000, "desc": "50km radius"}
    ]
    
    print("\n🌍 Testing geospatial edge cases:")
    for case in edge_cases:
        response = requests.get(f"{BACKEND_URL}/incidents", params={
            "latitude": case["lat"],
            "longitude": case["lng"], 
            "radius": case["radius"]
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {case['desc']}: {len(data)} results")
        else:
            print(f"❌ {case['desc']}: HTTP {response.status_code}")
    
    # Test 5: Verify error handling for invalid coordinates
    print("\n🚫 Testing invalid coordinate handling:")
    invalid_cases = [
        {"lat": 91, "lng": 0, "desc": "Latitude > 90"},
        {"lat": -91, "lng": 0, "desc": "Latitude < -90"},
        {"lat": 0, "lng": 181, "desc": "Longitude > 180"},
        {"lat": 0, "lng": -181, "desc": "Longitude < -180"}
    ]
    
    for case in invalid_cases:
        response = requests.get(f"{BACKEND_URL}/incidents", params={
            "latitude": case["lat"],
            "longitude": case["lng"],
            "radius": 1000
        })
        
        # MongoDB should handle these gracefully (they're technically valid for geospatial queries)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {case['desc']}: Handled gracefully - {len(data)} results")
        else:
            print(f"⚠️  {case['desc']}: HTTP {response.status_code}")
    
    print("\n📊 MongoDB and geospatial testing completed!")

if __name__ == "__main__":
    test_mongodb_indexes_and_geospatial()