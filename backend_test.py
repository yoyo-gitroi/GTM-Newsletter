import requests
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class GTMNewsletterAPITester:
    def __init__(self, base_url="https://gtm-nexus.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_newsletter_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Any]:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            success = response.status_code == expected_status
            response_data = None
            
            if success and response.content:
                try:
                    response_data = response.json()
                except:
                    response_data = response.text

            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")

            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, None

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_get_stats(self):
        """Test GET /api/stats"""
        success, data = self.run_test("Get Stats", "GET", "stats", 200)
        if success and data:
            required_fields = ["total_newsletters", "completed", "running", "failed"]
            for field in required_fields:
                if field not in data:
                    self.log_test(f"Stats field '{field}'", False, "Missing required field")
                    return False
            self.log_test("Stats structure validation", True, f"Found {len(data)} fields")
        return success

    def test_get_settings(self):
        """Test GET /api/settings"""
        success, data = self.run_test("Get Settings", "GET", "settings", 200)
        if success and data:
            if "monitored_tools" not in data:
                self.log_test("Settings structure", False, "Missing monitored_tools field")
                return False
            self.log_test("Settings structure validation", True, "Contains monitored_tools field")
        return success

    def test_update_settings(self):
        """Test PUT /api/settings"""
        test_tools = "TestTool1,TestTool2,TestTool3"
        success, data = self.run_test(
            "Update Settings", 
            "PUT", 
            "settings", 
            200,
            {"monitored_tools": test_tools}
        )
        if success and data:
            if data.get("monitored_tools") != test_tools:
                self.log_test("Settings update verification", False, "Updated value not returned")
                return False
            self.log_test("Settings update verification", True, "Value updated correctly")
        return success

    def test_get_newsletters(self):
        """Test GET /api/newsletters"""
        success, data = self.run_test("Get Newsletters", "GET", "newsletters", 200)
        if success:
            if not isinstance(data, list):
                self.log_test("Newsletters response type", False, "Expected list response")
                return False
            self.log_test("Newsletters response validation", True, f"Returned {len(data)} newsletters")
        return success

    def test_create_newsletter(self):
        """Test POST /api/newsletters"""
        test_data = {
            "title": f"Test Newsletter {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "date_range": "Feb 17 to Feb 24 2025",
            "custom_instructions": "Test instructions for API testing"
        }
        
        success, data = self.run_test("Create Newsletter", "POST", "newsletters", 200, test_data)
        
        if success and data:
            # Validate required fields
            required_fields = ["id", "title", "date_range", "status", "created_at"]
            for field in required_fields:
                if field not in data:
                    self.log_test(f"Newsletter field '{field}'", False, "Missing required field")
                    return False
            
            # Store the ID for subsequent tests
            self.created_newsletter_id = data["id"]
            self.log_test("Newsletter creation validation", True, f"Created newsletter ID: {data['id']}")
        
        return success

    def test_get_newsletter_by_id(self):
        """Test GET /api/newsletters/{id}"""
        if not self.created_newsletter_id:
            self.log_test("Get Newsletter by ID", False, "No newsletter ID available")
            return False
            
        success, data = self.run_test(
            "Get Newsletter by ID", 
            "GET", 
            f"newsletters/{self.created_newsletter_id}", 
            200
        )
        
        if success and data:
            if data.get("id") != self.created_newsletter_id:
                self.log_test("Newsletter ID verification", False, "Retrieved wrong newsletter")
                return False
            self.log_test("Newsletter retrieval validation", True, f"Retrieved correct newsletter")
        
        return success

    def test_update_newsletter(self):
        """Test PUT /api/newsletters/{id}"""
        if not self.created_newsletter_id:
            self.log_test("Update Newsletter", False, "No newsletter ID available")
            return False
            
        update_data = {
            "status": "running",
            "tool_search_output": "Test output from API test"
        }
        
        success, data = self.run_test(
            "Update Newsletter", 
            "PUT", 
            f"newsletters/{self.created_newsletter_id}", 
            200,
            update_data
        )
        
        if success and data:
            if data.get("status") != "running":
                self.log_test("Newsletter update verification", False, "Status not updated")
                return False
            self.log_test("Newsletter update validation", True, "Status updated successfully")
        
        return success

    def test_pipeline_endpoints(self):
        """Test pipeline-related endpoints"""
        if not self.created_newsletter_id:
            self.log_test("Pipeline Endpoints", False, "No newsletter ID available")
            return False

        # Test get status
        success1, _ = self.run_test(
            "Get Pipeline Status", 
            "GET", 
            f"newsletters/{self.created_newsletter_id}/status", 
            200
        )

        # Test start pipeline (note: this will actually trigger the pipeline)
        success2, _ = self.run_test(
            "Start Pipeline", 
            "POST", 
            f"newsletters/{self.created_newsletter_id}/run", 
            200
        )

        return success1 and success2

    def test_delete_newsletter(self):
        """Test DELETE /api/newsletters/{id}"""
        if not self.created_newsletter_id:
            self.log_test("Delete Newsletter", False, "No newsletter ID available")
            return False
            
        success, data = self.run_test(
            "Delete Newsletter", 
            "DELETE", 
            f"newsletters/{self.created_newsletter_id}", 
            200
        )
        
        if success:
            # Verify it's actually deleted
            success_verify, _ = self.run_test(
                "Verify Newsletter Deletion", 
                "GET", 
                f"newsletters/{self.created_newsletter_id}", 
                404
            )
            return success_verify
        
        return success

    def test_error_cases(self):
        """Test error handling"""
        # Test non-existent newsletter
        success1, _ = self.run_test(
            "Get Non-existent Newsletter", 
            "GET", 
            "newsletters/invalid-id", 
            404
        )

        # Test invalid newsletter creation
        success2, _ = self.run_test(
            "Create Invalid Newsletter", 
            "POST", 
            "newsletters", 
            422,  # FastAPI validation error
            {}  # Empty data should fail validation
        )

        return success1  # success2 might vary depending on validation

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting GTM Newsletter Intelligence API Tests")
        print(f"🔗 Base URL: {self.base_url}")
        print("=" * 60)

        # Basic connectivity tests
        print("\n📡 Basic Connectivity Tests")
        self.test_root_endpoint()

        # Settings tests
        print("\n⚙️  Settings Tests")  
        self.test_get_settings()
        self.test_update_settings()

        # Stats tests
        print("\n📊 Stats Tests")
        self.test_get_stats()

        # Newsletter CRUD tests
        print("\n📰 Newsletter CRUD Tests")
        self.test_get_newsletters()
        self.test_create_newsletter()
        self.test_get_newsletter_by_id()
        self.test_update_newsletter()

        # Pipeline tests
        print("\n🔄 Pipeline Tests")
        self.test_pipeline_endpoints()

        # Error handling tests
        print("\n❗ Error Handling Tests")
        self.test_error_cases()

        # Cleanup
        print("\n🧹 Cleanup Tests")
        self.test_delete_newsletter()

        # Final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test runner"""
    tester = GTMNewsletterAPITester()
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())