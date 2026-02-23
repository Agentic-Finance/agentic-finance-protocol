import requests

class PayPolAgentClient:
    def __init__(self, api_key, workspace_id, environment='testnet'):
        self.api_key = api_key
        self.workspace_id = workspace_id
        self.base_url = "https://testnet.api.paypol.io/v1" if environment == 'testnet' else "https://api.paypol.io/v1"

    def _request(self, endpoint, data):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(f"{self.base_url}{endpoint}", json=data, headers=headers)
        response.raise_for_status()
        return response.json()

    def dispatch_shielded_payout(self, name, wallet, amount, note=""):
        """
        Triggers a ZK-Shielded payout. 
        Amounts are encrypted via Noir ZK-Rollups on the PayPol backend.
        """
        payload = {
            "recipientName": name,
            "walletAddress": wallet,
            "amount": amount,
            "workspaceId": self.workspace_id,
            "isShielded": True,
            "reference": note
        }
        return self._request("/payload/dispatch", payload)