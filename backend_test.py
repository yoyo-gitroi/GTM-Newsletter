import requests
import sys
import json
from datetime import datetime

class GTMApiTester:
    def __init__(self, base_url="https://gtm-nexus.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        if not headers:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_json = response.json()
                    if endpoint.startswith('agent-prompts') and method == 'GET':
                        if isinstance(response_json, list):
                            print(f"   Found {len(response_json)} agent prompts")
                        else:
                            print(f"   Agent: {response_json.get('agent_name', 'N/A')}")
                            print(f"   Prompt length: {len(response_json.get('prompt', ''))}")
                except:
                    print("   Response: Success (no JSON)")
            else:
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'url': url,
                    'response': response.text[:200] if response.text else 'No response'
                })
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            self.failed_tests.append({
                'test': name,
                'error': str(e),
                'url': url
            })
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET", 
            "",
            200
        )

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        success1, _ = self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200
        )
        
        success2, _ = self.run_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data={"monitored_tools": "TestTool1,TestTool2,TestTool3"}
        )
        
        return success1 and success2

    def test_agent_prompts_get_all(self):
        """Test GET /api/agent-prompts"""
        return self.run_test(
            "Get All Agent Prompts",
            "GET",
            "agent-prompts",
            200
        )

    def test_agent_prompts_individual(self):
        """Test individual agent prompt endpoints"""
        agents = ["scout", "tracker", "sage", "nexus", "language", "html"]
        all_success = True
        
        for agent in agents:
            success, _ = self.run_test(
                f"Get {agent.title()} Agent Prompt",
                "GET",
                f"agent-prompts/{agent}",
                200
            )
            if not success:
                all_success = False
        
        return all_success

    def test_agent_prompt_update_and_reset(self):
        """Test updating and resetting agent prompts"""
        test_agent = "scout"
        test_prompt = "This is a test custom prompt for the scout agent."
        
        # Update prompt
        success1, response1 = self.run_test(
            f"Update {test_agent.title()} Agent Prompt",
            "PUT",
            f"agent-prompts/{test_agent}",
            200,
            data={"prompt": test_prompt}
        )
        
        if success1:
            print(f"   Updated prompt ID: {response1.get('id', 'N/A')}")
            print(f"   Updated agent: {response1.get('agent_name', 'N/A')}")
        
        # Get updated prompt to verify
        success2, response2 = self.run_test(
            f"Verify {test_agent.title()} Prompt Update",
            "GET",
            f"agent-prompts/{test_agent}",
            200
        )
        
        # Check if the prompt was actually updated
        prompt_matches = False
        if success2 and response2.get('prompt') == test_prompt:
            prompt_matches = True
            print(f"   ✅ Prompt update verified")
        else:
            print(f"   ❌ Prompt update verification failed")
        
        # Reset to default
        success3, response3 = self.run_test(
            f"Reset {test_agent.title()} Agent Prompt",
            "DELETE",
            f"agent-prompts/{test_agent}",
            200
        )
        
        if success3:
            print(f"   Reset message: {response3.get('message', 'N/A')}")
        
        # Verify reset worked
        success4, response4 = self.run_test(
            f"Verify {test_agent.title()} Prompt Reset",
            "GET",
            f"agent-prompts/{test_agent}",
            200
        )
        
        reset_verified = False
        if success4 and response4.get('prompt') != test_prompt:
            reset_verified = True
            print(f"   ✅ Prompt reset verified")
        else:
            print(f"   ❌ Prompt reset verification failed")
        
        return success1 and success2 and success3 and success4 and prompt_matches and reset_verified

    def test_newsletter_endpoints(self):
        """Test basic newsletter endpoints"""
        success1, _ = self.run_test(
            "Get All Newsletters",
            "GET",
            "newsletters",
            200
        )
        
        success2, _ = self.run_test(
            "Get Stats",
            "GET", 
            "stats",
            200
        )
        
        return success1 and success2

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure.get('test', 'Unknown test')}")
                if 'error' in failure:
                    print(f"   Error: {failure['error']}")
                else:
                    print(f"   Expected: {failure.get('expected')}, Got: {failure.get('actual')}")
                print(f"   URL: {failure.get('url', 'N/A')}")
                if 'response' in failure:
                    print(f"   Response: {failure['response']}")
                print()
        
        return self.tests_run - len(self.failed_tests) == self.tests_run

def main():
    """Main test execution"""
    print("🚀 Starting GTM Newsletter Intelligence API Tests")
    print("="*60)
    
    tester = GTMApiTester()
    
    # Run all test suites
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Settings Endpoints", tester.test_settings_endpoints),
        ("Get All Agent Prompts", tester.test_agent_prompts_get_all),
        ("Individual Agent Prompts", tester.test_agent_prompts_individual),
        ("Agent Prompt Update/Reset", tester.test_agent_prompt_update_and_reset),
        ("Newsletter Endpoints", tester.test_newsletter_endpoints),
    ]
    
    print(f"Running {len(tests)} test suites...\n")
    
    for test_name, test_func in tests:
        print(f"📋 Running: {test_name}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test suite '{test_name}' crashed: {str(e)}")
    
    # Print final summary
    all_passed = tester.print_summary()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())