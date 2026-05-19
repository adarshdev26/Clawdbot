import { useState } from "react";
import { X } from "lucide-react";


export default function VerifyModal({
  open,
  onClose,
  onSubmit,
}) {
  const [chainId, setChainId] = useState(1);
  const [tokenAddress, setTokenAddress] = useState("");
  const [minimumRequired, setMinimumRequired] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!tokenAddress || !minimumRequired) {
      alert("Please fill all fields");
      return;
    }

    onSubmit({
      chainId,
      tokenAddress,
      minimumRequired,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b1020] p-8 text-white">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">
            Verify Token Balance
          </h2>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm text-zinc-400">
              Chain ID
            </label>

            <input
              type="number"
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="w-full mt-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">
              Token Address
            </label>

            <input
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="w-full mt-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">
              Minimum Required (Base Units)
            </label>

            <input
              value={minimumRequired}
              onChange={(e) => setMinimumRequired(e.target.value)}
              placeholder="1000000000000000000"
              className="w-full mt-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-4 font-semibold"
          >
            Verify Access
          </button>
        </div>
      </div>
    </div>
  );
}