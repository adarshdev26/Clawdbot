import { useState } from "react";
import {
  Wallet,
  Shield,
  PenSquare,
  Lock,
  User,
  KeyRound,
  ChevronRight,
    Loader2,
} from "lucide-react";
import InvoiceModal from "./components/InvoiceModel";
import VerifyModal from "./components/VerifyModal";

export default function AuthWorkerUI() {
  const [wallet, setWallet] = useState("");
  const [nonce, setNonce] = useState("");
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [token, setToken] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const [loading, setLoading] = useState({
    connect: false,
    challenge: false,
    login: false,
    verify: false,
    invoice: false,
    payment: false,
    receipt: false,
  });
  const connectWallet = async () => {
    try {
      setLoading((prev) => ({ ...prev, connect: true }));

      if (!window.ethereum) {
        alert("MetaMask not found");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setWallet(accounts[0]);
    } finally {
      setLoading((prev) => ({ ...prev, connect: false }));
    }
  };

  const getChallenge = async () => {
    try {
      setLoading((prev) => ({ ...prev, challenge: true }));
      const res = await fetch(`${API_URL}/challenge?address=${wallet}`);

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setNonce(data.nonce);
    } catch (err) {
      console.error(err);
      alert("Challenge request failed");
    } finally {
      setLoading((prev) => ({ ...prev, challenge: false }));
    }
  };
  const signAndLogin = async () => {
    try {
      setLoading((prev) => ({ ...prev, login: true }));
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
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);

        alert("✅ Login successful");
      }
    } catch (err) {
      console.error(err);
      alert("Login failed");
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  };

  const accessProtected = async (verifyData) => {
    try {
      setLoading((prev) => ({ ...prev, verify: true }));

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
    } catch (err) {
      console.error(err);
      alert("Verification failed");
    } finally {
      setLoading((prev) => ({ ...prev, verify: false }));
    }
  };

  const checkJobStatus = async (jobId) => {
    try {
      const res = await fetch(`${API_URL}/job/status/${jobId}`);

      const data = await res.json();

      console.log("job status", data);

      return data;
    } catch (err) {
      console.error(err);
    }
  };

  const pollPayment = async (jobId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/receipt/${jobId}`, {
          method: "POST",
        });

        const data = await res.json();

        console.log("receipt response", data);

        if (data.status === "paid") {
          clearInterval(interval);

          alert(`
✅ Payment Received

TX HASH:
${data.txHash}
`);
        }

        if (data.status === "expired") {
          clearInterval(interval);

          alert("❌ Invoice expired");
        }

        if (data.error) {
          clearInterval(interval);

          alert(data.error);
        }
      } catch (err) {
        clearInterval(interval);

        console.error(err);

        alert("Polling failed");
      }
    }, 5000);
  };

  const createInvoice = async (invoiceData) => {
    const savedToken = localStorage.getItem("token");

    if (!savedToken) {
      alert("Login first");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, invoice: true }));
      const res = await fetch(`${API_URL}/invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify(invoiceData),
      });

      const data = await res.json();
      setCurrentInvoice(data);

      if (data.error) {
        alert(data.error);
        return;
      }

      alert(`
✅ Invoice Created

Job ID:
${data.jobId}

Cost:
${data.cost}

Expires:
${data.expiresIn}s
`);

      // optional
      await checkJobStatus(data.jobId);
    } catch (err) {
      console.error(err);

      alert("Invoice creation failed");
    } finally {
      setLoading((prev) => ({ ...prev, invoice: false }));
    }
  };

const makePayment = async () => {
  try {
    setLoading((prev) => ({ ...prev, payment: true }));

    if (!currentInvoice) {
      alert("Create invoice first");
      return;
    }

    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const account = accounts[0];

    // ERC20 transfer(address,uint256)
    const transferMethodId = "0xa9059cbb";

    // clean address
    const recipient = currentInvoice.payTo.replace(/^0x/, "");

    // 32-byte padded address
    const paddedAddress = recipient.padStart(64, "0");

    // amount hex
    const amountHex = BigInt(
      currentInvoice.costInBaseUnits
    ).toString(16);

    // 32-byte padded amount
    const paddedAmount = amountHex.padStart(64, "0");

    // final calldata
    const dataPayload =
      transferMethodId +
      paddedAddress +
      paddedAmount;

    console.log("dataPayload", dataPayload);

    const hash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: currentInvoice.tokenAddress,
          data: dataPayload,
          value: "0x00",
        },
      ],
    });

    setTxHash(hash);

    alert(`✅ Payment Sent

TX HASH:
${hash}`);
  } catch (err) {
    console.error(err);
    alert("Payment failed");
  } finally {
    setLoading((prev) => ({ ...prev, payment: false }));
  }
};
  const getReceipt = async () => {
    try {
      setLoading((prev) => ({ ...prev, receipt: true }));
      if (!currentInvoice?.jobId) {
        alert("Create invoice first");
        return;
      }

      const res = await fetch(`${API_URL}/receipt/${currentInvoice.jobId}`, {
        method: "POST",
      });

      const data = await res.json();

      console.log("receipt", data);

      if (data.status === "paid") {
        setTxHash(data.txHash);

        alert(`✅ Payment Verified

TX HASH:
${data.txHash}`);
      } else if (data.status === "pending") {
        alert("⏳ Payment still pending");
      } else if (data.status === "expired") {
        alert("❌ Invoice expired");
      } else {
        alert(data.error || "Receipt failed");
      }
    } catch (err) {
      console.error(err);
      alert("Receipt fetch failed");
    } finally {
      setLoading((prev) => ({ ...prev, receipt: false }));
    }
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
    {
      title: "Make Payment",
      desc: "Open MetaMask payment",
      icon: Wallet,
      action: makePayment,
      glow: "from-emerald-500/30 to-emerald-900/10",
    },
    {
      title: "Get Receipt",
      desc: "Fetch blockchain receipt",
      icon: Shield,
      action: getReceipt,
      glow: "from-cyan-500/30 to-cyan-900/10",
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
  <span>
    {card.title === "Connect MetaMask" && loading.connect
      ? "Loading..."
      : card.title === "Get Challenge" && loading.challenge
      ? "Loading..."
      : card.title === "Sign & Login" && loading.login
      ? "Loading..."
      : card.title === "Open Protected Route" && loading.verify
      ? "Verifying..."
      : card.title === "Create Invoice" && loading.invoice
      ? "Creating..."
      : card.title === "Make Payment" && loading.payment
      ? "Processing..."
      : card.title === "Get Receipt" && loading.receipt
      ? "Checking..."
      : "Continue"}
  </span>

  {(card.title === "Connect MetaMask" && loading.connect) ||
  (card.title === "Get Challenge" && loading.challenge) ||
  (card.title === "Sign & Login" && loading.login) ||
  (card.title === "Open Protected Route" && loading.verify) ||
  (card.title === "Create Invoice" && loading.invoice) ||
  (card.title === "Make Payment" && loading.payment) ||
  (card.title === "Get Receipt" && loading.receipt) ? (
    <Loader2 className="animate-spin" size={18} />
  ) : (
    <ChevronRight size={18} />
  )}
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
