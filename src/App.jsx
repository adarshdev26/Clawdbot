import { useState } from "react";

export default function AuthWorkerUI() {
  const [wallet, setWallet] = useState("");
  const [nonce, setNonce] = useState("");
  const [token, setToken] = useState("");

 const API_URL = import.meta.env.VITE_API_URL;

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setWallet(accounts[0]);
  };

  const getChallenge = async () => {
    const res = await fetch(
      `${API_URL}/challenge?address=${wallet}&chainId=1`
    );

    const data = await res.json();
    setNonce(data.nonce);
  };

  const signAndLogin = async () => {
    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [nonce, wallet],
    });

    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: wallet,
        signature,
        nonce,
        chainId: 1,
      }),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
  };

  const accessProtected = async () => {
    const savedToken = localStorage.getItem("token");

    if (!savedToken) {
      alert("Login first");
      return;
    }

    const res = await fetch(`${API_URL}/protected`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${savedToken}`,
      },
      redirect: "follow",
    });

    if (res.redirected) {
      window.location.href = res.url;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-semibold mb-6">Web3 Wallet Login</h1>

        <div className="space-y-4">
          <button
            onClick={connectWallet}
            className="w-full rounded-2xl px-4 py-3 bg-white text-black font-medium"
          >
            Connect MetaMask
          </button>

          <button
            onClick={getChallenge}
            className="w-full rounded-2xl px-4 py-3 bg-blue-600 font-medium"
          >
            Get Challenge
          </button>

          <button
            onClick={signAndLogin}
            className="w-full rounded-2xl px-4 py-3 bg-green-600 font-medium"
          >
            Sign & Login
          </button>
          <button
            onClick={accessProtected}
            className="w-full rounded-2xl px-4 py-3 bg-purple-600 font-medium"
          >
            Open Protected Route
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm space-y-2 break-all">
          <p><strong>Wallet:</strong> {wallet || "Not connected"}</p>
          <p><strong>Nonce:</strong> {nonce || "Pending"}</p>
          <p><strong>JWT:</strong> {token ? `${token.slice(0, 30)}...` : "Not issued"}</p>
        </div>
      </div>
    </div>
  );
}
