import { useState } from "react";
import {
  Wallet,
  Shield,
  PenSquare,
  Lock,
  User,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import InvoiceModal from "./components/InvoiceModel";
import VerifyModal from "./components/VerifyModal";

export default function AuthWorkerUI() {
  const [wallet, setWallet] = useState("");
  const [nonce, setNonce] = useState("");
  const [token, setToken] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask not found");
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setWallet(accounts[0]);
  };

  const getChallenge = async () => {
    const res = await fetch(`${API_URL}/challenge?address=${wallet}`);
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    }
    setNonce(data.nonce);
  };

  const signAndLogin = async () => {
    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [nonce, wallet],
    });

    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: wallet,
        signature,
        nonce
      }),
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
    }
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
  };

const accessProtected = async (verifyData) => {
  const savedToken = localStorage.getItem("token");

  if (!savedToken) {
    alert("Login first");
    return;
  }

  const res = await fetch(`${API_URL}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${savedToken}`,
    },
    body: JSON.stringify(verifyData),
  });

  const data = await res.json();

  if (data.hasMinimumBalance !== undefined) {
    alert(`
Balance: ${data.balance}

Minimum Required: ${data.minimumRequired}

Access: ${data.hasMinimumBalance ? "Granted" : "Denied"}
`);
  } else {
    alert(data.error || "Failed");
  }
};

const createInvoice = async (invoiceData) => {
  const savedToken = localStorage.getItem("token");

  if (!savedToken) {
    alert("Login first");
    return;
  }

  const res = await fetch(`${API_URL}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${savedToken}`,
    },
    body: JSON.stringify(invoiceData),
  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  alert(`
Invoice Created

Job ID: ${data.jobId}
Cost: ${data.cost}
`);

  pollPayment(data.jobId);
};

const createJob = async () => {
  const savedToken = localStorage.getItem("token");
  if (!savedToken) { alert("Login first"); return; }

  const res = await fetch(`${API_URL}/job/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${savedToken}` },
  });

  const data = await res.json();

  if (data.error) { alert(data.error); return; }

  // Pehle user ko payment info dikhao
  alert(
    `Job Created!\n\nCost: ${data.cost} ${data.token}\nNetwork: ${data.network}\nPay To: ${data.payTo}\nExpires In: ${data.expiresIn} seconds`
  );

  // Phir polling shuru karo
  await pollPayment(data.jobId);
};

const checkJobStatus = async (jobId) => {
  const res = await fetch(
    `${API_URL}/job/status/${jobId}`
  );

  const data = await res.json();

};

const pollPayment = async (jobId) => {
  const interval = setInterval(async () => {
    const res = await fetch(`${API_URL}/job/check-payment/${jobId}`, {
      method: "POST",
    });

    const data = await res.json();
    console.log("payment status", data);

    if (data.status === "paid") {
      clearInterval(interval);
      alert(`✅ Payment received!\nTx: ${data.txHash}`);
    }

    if (data.status === "expired") {
      clearInterval(interval);
      alert("❌ Payment expired");
    }

    if (data.error) {
      clearInterval(interval);
      alert(`Error: ${data.error}`);
    }
  }, 5000);
};
  const topSteps = [
    {
      icon: Wallet,
      title: "Connect Wallet",
      desc: "Connect your MetaMask wallet",
    },
    {
      icon: Shield,
      title: "Get Challenge",
      desc: "Request a unique signing challenge",
    },
    {
      icon: PenSquare,
      title: "Sign & Login",
      desc: "Sign the challenge and login",
    },
    {
      icon: Lock,
      title: "Access Protected",
      desc: "Access your protected resources",
    },
  ];

  const cards = [
    {
      title: "Connect MetaMask",
      desc: "Connect your wallet to get started",
      icon: Wallet,
      action: connectWallet,
      glow: "from-purple-500/30 to-purple-900/10",
    },
    {
      title: "Get Challenge",
      desc: "Get a unique challenge to sign",
      icon: Shield,
      action: getChallenge,
      glow: "from-blue-500/30 to-blue-900/10",
    },
    {
      title: "Sign & Login",
      desc: "Sign the challenge to authenticate",
      icon: PenSquare,
      action: signAndLogin,
      glow: "from-green-500/30 to-green-900/10",
    },
    {
      title: "Open Protected Route",
      desc: "Access your protected resources",
      icon: Lock,
      action: () => setVerifyOpen(true),
      glow: "from-pink-500/30 to-pink-900/10",
    },
    {
  title: "Create Invoice",
  desc: "Create blockchain invoice",
  icon: Wallet,
  action: () => setInvoiceOpen(true),
  glow: "from-orange-500/30 to-orange-900/10",
},
  ];

  return (
    <div className="min-h-screen bg-[#040714] text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl text-sm text-zinc-300 mb-8">
            Secure • Decentralized • Privacy First
          </div>

          <h1 className="text-7xl font-bold leading-tight bg-gradient-to-r from-purple-500 via-white to-blue-400 bg-clip-text text-transparent">
            Web3 Wallet Login
          </h1>

          <p className="text-zinc-400 mt-5 text-xl">
            Sign in with your wallet. No passwords. Just you.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-10">
          {topSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center"
              >
                <div className="w-20 h-20 mx-auto rounded-full border border-white/20 bg-white/5 flex items-center justify-center mb-5 shadow-lg">
                  <Icon size={28} />
                </div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-zinc-400 text-sm mt-3">{step.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <button
                key={i}
                onClick={card.action}
                className={`rounded-[28px] border border-white/10 bg-gradient-to-b ${card.glow} p-8 text-left backdrop-blur-xl hover:scale-105 transition-all duration-300`}
              >
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/10 flex items-center justify-center mb-6">
                  <Icon size={28} />
                </div>

                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-zinc-400 text-sm mb-6">{card.desc}</p>

                <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 bg-white/5">
                  <span>Continue</span>
                  <ChevronRight size={18} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <h2 className="text-2xl font-semibold mb-8">Authentication Status</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: "Wallet", value: wallet || "Not connected", icon: User },
              { label: "Nonce", value: nonce || "Pending", icon: Shield },
              {
                label: "JWT Token",
                value: token ? `${token.slice(0, 30)}...` : "Not issued",
                icon: KeyRound,
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <p className="text-zinc-400 text-sm break-all">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <InvoiceModal
  open={invoiceOpen}
  onClose={() => setInvoiceOpen(false)}
  onSubmit={createInvoice}
  wallet={wallet}
/>
<VerifyModal
  open={verifyOpen}
  onClose={() => setVerifyOpen(false)}
  onSubmit={accessProtected}
/>
    </div>
  );
}
