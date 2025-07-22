"use client";

import { useState, useEffect } from "react";
import { formatUnits } from "viem";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Loader2,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Bot,
  Target,
  Zap,
} from "lucide-react";
import { FaGlobe, FaTwitter, FaTelegramPlane, FaDiscord } from "react-icons/fa";
import { toast } from "sonner";
import { chatEventEmitter, CHAT_EVENTS } from "@/lib/eventEmitter";
import { useUserStore } from "@/stores/userStore";

interface Token {
  _id: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  price?: string;
  marketCap?: string;
  volume24hBuy?: string;
  volume24hSell?: string;
  volume24hTotal?: string;
  creator: string;
  createdAt: string;
}

interface DetailedToken {
  _id: string;
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  timestamp: string;
  blockNumber: string;
  price?: string;
  marketCap?: string;
  volume24hBuy?: string;
  volume24hSell?: string;
  volume24hTotal?: string;
  createdAt: string;
  updatedAt: string;
  userTokenBalance?: string;
}

interface Bot {
  botId: string;
  tokenAddress: string;
  targetGrowthPerHour: number;
  budget: string;
  isActive: boolean;
  totalTrades: number;
  totalBuyVolume: string;
  totalSellVolume: string;
  currentUsdtBalance: string;
  currentTokenBalance: string;
  lastTradeAt?: string;
  nextTradeAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface BotLog {
  action: "buy" | "sell" | "pause" | "error" | "start" | "stop";
  amount: string;
  priceBefore?: string;
  priceAfter?: string;
  transactionHash?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
  nextTradeScheduledAt?: string;
  metadata?: any;
}

interface CreateBotForm {
  tokenAddress: string;
  targetGrowthPerHour: string;
  budget: string;
}

export default function BotsPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [detailedTokens, setDetailedTokens] = useState<
    Record<string, DetailedToken>
  >({});
  const [botLogs, setBotLogs] = useState<Record<string, BotLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState<
    Record<string, boolean>
  >({});

  const [formData, setFormData] = useState<CreateBotForm>({
    tokenAddress: "",
    targetGrowthPerHour: "1",
    budget: "100",
  });

  const { get, post, delete: del } = useApi();
  const { isAuthenticated } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      fetchBots();
      fetchTokens(); // Fetch tokens on page load for the create dialog
    }
  }, [isAuthenticated]);

  // Listen for chat refresh events
  useEffect(() => {
    const handleRefreshBots = () => {
      console.log(`[BOTS PAGE] Received refresh bots event from chat`);
      if (isAuthenticated) {
        fetchBots(true);
      }
    };

    chatEventEmitter.on(CHAT_EVENTS.REFRESH_TOKENS, handleRefreshBots);
    return () => {
      chatEventEmitter.off(CHAT_EVENTS.REFRESH_TOKENS, handleRefreshBots);
    };
  }, [isAuthenticated]);

  const fetchTokens = async () => {
    try {
      setTokensLoading(true);
      const response = await get<{ success: boolean; data: Token[] }>(
        "/tokens"
      );
      if (response.data.success) {
        setTokens(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
      toast.error("Failed to fetch tokens");
    } finally {
      setTokensLoading(false);
    }
  };

  const fetchDetailedToken = async (
    tokenAddress: string,
    silent: boolean = false
  ) => {
    try {
      const response = await get<{ success: boolean; data: DetailedToken }>(
        `/tokens/address/${tokenAddress}`
      );
      if (response.data.success) {
        setDetailedTokens((prev) => ({
          ...prev,
          [tokenAddress]: response.data.data,
        }));
      }
    } catch (error) {
      if (!silent) {
        console.error(`Error fetching detailed token ${tokenAddress}:`, error);
      }
    }
  };

  const fetchBots = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await get<{ success: boolean; data: Bot[] }>(
        "/market-maker/bots"
      );
      if (response.data.success) {
        setBots(response.data.data);

        // Fetch logs and detailed token info for each bot
        for (const bot of response.data.data) {
          fetchBotLogs(bot.tokenAddress, true);
          fetchDetailedToken(bot.tokenAddress, true);
        }
      }
    } catch (error) {
      console.error("Error fetching bots:", error);
      toast.error("Failed to fetch autonomous agents");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchBotLogs = async (
    tokenAddress: string,
    silent: boolean = false
  ) => {
    try {
      const response = await get<{ success: boolean; data: BotLog[] }>(
        `/market-maker/logs/${tokenAddress}?limit=10`
      );
      if (response.data.success) {
        setBotLogs((prev) => ({
          ...prev,
          [tokenAddress]: response.data.data,
        }));
      }
    } catch (error) {
      if (!silent) {
        console.error("Error fetching bot logs:", error);
      }
    }
  };

  const handleCreateBot = async () => {
    if (
      !formData.tokenAddress ||
      !formData.targetGrowthPerHour ||
      !formData.budget
    ) {
      setCreateError("Please fill in all required fields");
      return;
    }

    const growthPerHour = parseFloat(formData.targetGrowthPerHour);
    const budgetAmount = parseFloat(formData.budget);

    if (growthPerHour < 0.1 || growthPerHour > 10) {
      setCreateError("Target growth must be between 0.1% and 10% per hour");
      return;
    }

    if (budgetAmount < 10 || budgetAmount > 10000) {
      setCreateError("Budget must be between 10 and 10,000 USDT");
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      const response = await post("/market-maker/create", {
        tokenAddress: formData.tokenAddress,
        targetGrowthPerHour: growthPerHour,
        budget: formData.budget,
      });

      if (response.data.success) {
        toast.success("Autonomous agent created successfully!");
        setIsCreateDialogOpen(false);
        setFormData({
          tokenAddress: "",
          targetGrowthPerHour: "1",
          budget: "100",
        });
        // Silent refresh to avoid blinking after a brief delay
        setTimeout(() => {
          fetchBots(true);
        }, 300);
      } else {
        setCreateError(response.data.error || "Failed to create agent");
      }
    } catch (error: any) {
      console.error("Error creating bot:", error);
      setCreateError(error.response?.data?.error || "Failed to create agent");
    } finally {
      setIsCreating(false);
    }
  };

  const handleBotOperation = async (
    tokenAddress: string,
    operation: "start" | "stop" | "delete"
  ) => {
    const operationKey = `${tokenAddress}-${operation}`;

    // Prevent duplicate operations
    if (operationLoading[operationKey]) {
      return;
    }

    try {
      setOperationLoading((prev) => ({ ...prev, [operationKey]: true }));

      let response;
      if (operation === "delete") {
        response = await del(`/market-maker/${tokenAddress}`);
      } else {
        response = await post(`/market-maker/${operation}`, { tokenAddress });
      }

      if (response.data.success) {
        // Optimistic update for immediate UI feedback
        if (operation === "start" || operation === "stop") {
          setBots((prevBots) =>
            prevBots.map((bot) =>
              bot.tokenAddress === tokenAddress
                ? { ...bot, isActive: operation === "start" }
                : bot
            )
          );
        } else if (operation === "delete") {
          setBots((prevBots) =>
            prevBots.filter((bot) => bot.tokenAddress !== tokenAddress)
          );
        }

        toast.success(
          `Agent ${operation}${
            operation === "stop" ? "ped" : operation === "start" ? "ed" : "d"
          } successfully!`
        );

        // Silent refresh to sync with server after a brief delay
        setTimeout(() => {
          fetchBots(true);
        }, 500);
      } else {
        toast.error(response.data.error || `Failed to ${operation} agent`);
      }
    } catch (error: any) {
      console.error(`Error ${operation}ing bot:`, error);
      toast.error(
        error.response?.data?.error || `Failed to ${operation} agent`
      );
    } finally {
      setOperationLoading((prev) => ({ ...prev, [operationKey]: false }));
    }
  };

  const formatCurrency = (
    amountWei: string | undefined,
    decimals: number = 18
  ) => {
    if (!amountWei || amountWei === "0") return "$0.00";
    try {
      const amount = parseFloat(formatUnits(BigInt(amountWei), decimals));
      return `$${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } catch {
      return "$0.00";
    }
  };

  const formatTokenAmount = (
    amountWei: string | undefined,
    decimals: number = 18
  ) => {
    if (!amountWei || amountWei === "0") return "0";
    try {
      const amount = parseFloat(formatUnits(BigInt(amountWei), decimals));
      return amount.toLocaleString("en-US", { maximumFractionDigits: 4 });
    } catch {
      return "0";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatPrice = (priceWei: string | undefined) => {
    if (!priceWei || priceWei === "0") return "N/A";
    try {
      const price = parseFloat(formatUnits(BigInt(priceWei), 18));
      return `$${price.toFixed(6)}`;
    } catch {
      return "N/A";
    }
  };

  const formatMarketCap = (marketCapWei: string | undefined) => {
    if (!marketCapWei || marketCapWei === "0") return "N/A";
    try {
      const marketCap = parseFloat(formatUnits(BigInt(marketCapWei), 18));
      if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(2)}B`;
      } else if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(2)}M`;
      } else if (marketCap >= 1e3) {
        return `$${(marketCap / 1e3).toFixed(2)}K`;
      } else {
        return `$${marketCap.toFixed(2)}`;
      }
    } catch {
      return "N/A";
    }
  };

  const formatVolume = (volumeWei: string | undefined) => {
    if (!volumeWei || volumeWei === "0") return "N/A";
    try {
      const volume = parseFloat(formatUnits(BigInt(volumeWei), 18));
      if (volume >= 1e9) {
        return `$${(volume / 1e9).toFixed(2)}B`;
      } else if (volume >= 1e6) {
        return `$${(volume / 1e6).toFixed(2)}M`;
      } else if (volume >= 1e3) {
        return `$${(volume / 1e3).toFixed(2)}K`;
      } else {
        return `$${volume.toFixed(2)}`;
      }
    } catch {
      return "N/A";
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCopyCreatorAddress = async (creatorAddress: string) => {
    try {
      await navigator.clipboard.writeText(creatorAddress);
      toast.success("Creator address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy creator address:", error);
      toast.error("Failed to copy creator address");
    }
  };

  const handleCopyContractAddress = async (contractAddress: string) => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      toast.success("Contract address copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy contract address:", error);
      toast.error("Failed to copy contract address");
    }
  };

  const openLink = (url: string) => {
    if (url && url !== "") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const getLogIcon = (action: string) => {
    switch (action) {
      case "buy":
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case "sell":
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      case "start":
        return <Play className="h-3 w-3 text-blue-500" />;
      case "stop":
        return <Pause className="h-3 w-3 text-yellow-500" />;
      case "error":
        return <Zap className="h-3 w-3 text-red-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access the autonomous agents dashboard
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 pb-16">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {[...Array(3)].map((_, i) => (
            <Card key={i} className="w-full">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-16">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Autonomous Agents Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your liquidity automation agents on the Sei network
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>
                {bots.length} agent{bots.length !== 1 ? "s" : ""}
              </span>
              <span>•</span>
              <span>{bots.filter((bot) => bot.isActive).length} active</span>
              <span>•</span>
              <span>
                {bots.reduce((sum, bot) => sum + bot.totalTrades, 0)} total
                trades
              </span>
            </div>
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Autonomous Agent</DialogTitle>
                <DialogDescription>
                  Configure a new liquidity automation agent for your selected
                  token
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {createError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-md text-sm">
                    {createError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Token</label>
                  <Select
                    value={formData.tokenAddress}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, tokenAddress: value }))
                    }
                    disabled={tokensLoading}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          tokensLoading
                            ? "Loading tokens..."
                            : tokens.length === 0
                            ? "No tokens available"
                            : "Choose a token"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tokensLoading ? (
                        <SelectItem value="" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading tokens...
                          </div>
                        </SelectItem>
                      ) : tokens.length === 0 ? (
                        <SelectItem value="" disabled>
                          No tokens available
                        </SelectItem>
                      ) : (
                        tokens.map((token) => (
                          <SelectItem
                            key={token.tokenAddress}
                            value={token.tokenAddress}
                          >
                            <div className="flex items-center gap-2">
                              {token.image ? (
                                <img
                                  src={token.image}
                                  alt={token.name}
                                  className="w-5 h-5 rounded-full"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                                  {token.symbol.charAt(0)}
                                </div>
                              )}
                              <span>{token.name}</span>
                              <span className="text-muted-foreground">
                                ({token.symbol})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Target Growth (%/hour)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={formData.targetGrowthPerHour}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetGrowthPerHour: e.target.value,
                        }))
                      }
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Budget (USDT)</label>
                    <Input
                      type="number"
                      min="10"
                      max="10000"
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          budget: e.target.value,
                        }))
                      }
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setCreateError(null);
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBot} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Agent"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bots List */}
        {bots.length === 0 ? (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <CardTitle className="text-lg text-muted-foreground mb-2">
                No Agents Created
              </CardTitle>
              <CardDescription className="text-center mb-4">
                Create your first autonomous agent to start automating liquidity
                on Sei
              </CardDescription>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Your First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bots.map((bot) => {
              const logs = botLogs[bot.tokenAddress] || [];

              return (
                <Card key={bot.botId} className="w-full">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-2 gap-6">
                      {/* Token Info Section */}
                      <div className="space-y-4 p-4 rounded-lg bg-muted/20">
                        <h3 className="text-lg font-semibold">Token Info</h3>
                        {(() => {
                          const detailedToken =
                            detailedTokens[bot.tokenAddress];
                          if (!detailedToken) {
                            return (
                              <div className="space-y-3">
                                <div className="animate-pulse">
                                  <div className="h-8 w-8 bg-muted rounded-full mb-2"></div>
                                  <div className="h-4 w-24 bg-muted rounded mb-1"></div>
                                  <div className="h-3 w-16 bg-muted rounded"></div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                {detailedToken.image ? (
                                  <img
                                    src={detailedToken.image}
                                    alt={detailedToken.name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-border"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        detailedToken.name
                                      )}&background=random`;
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center border-2 border-border">
                                    <span className="text-sm font-semibold text-accent-foreground">
                                      {detailedToken.symbol.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm truncate">
                                    {detailedToken.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    ${detailedToken.symbol}
                                  </div>
                                </div>
                              </div>

                              {detailedToken.description && (
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                  {detailedToken.description.length > 100
                                    ? `${detailedToken.description.substring(
                                        0,
                                        100
                                      )}...`
                                    : detailedToken.description}
                                </p>
                              )}

                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Price:
                                  </span>
                                  <span className="font-mono text-green-600">
                                    {formatPrice(detailedToken.price)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Market Cap:
                                  </span>
                                  <span className="font-mono text-blue-600">
                                    {formatMarketCap(detailedToken.marketCap)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    24h Volume:
                                  </span>
                                  <span className="font-mono text-purple-600">
                                    {formatVolume(detailedToken.volume24hTotal)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Creator:
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleCopyCreatorAddress(
                                        detailedToken.creator
                                      )
                                    }
                                    className="font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer text-xs"
                                    title="Click to copy address"
                                  >
                                    {shortenAddress(detailedToken.creator)}
                                  </button>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Contract:
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleCopyContractAddress(
                                        detailedToken.tokenAddress
                                      )
                                    }
                                    className="font-mono hover:bg-muted/50 rounded px-1 py-0.5 transition-colors cursor-pointer text-xs"
                                    title="Click to copy address"
                                  >
                                    {shortenAddress(detailedToken.tokenAddress)}
                                  </button>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Created:
                                  </span>
                                  <span className="text-xs">
                                    {formatDate(detailedToken.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {/* View Token & Social Links */}
                              <div className="flex gap-2 pt-3">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/token/${detailedToken.tokenAddress}`
                                    )
                                  }
                                  className="flex-1 text-xs h-6 rounded-md"
                                >
                                  View Token
                                </Button>
                                <div className="flex gap-1">
                                  {detailedToken.website && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        openLink(detailedToken.website)
                                      }
                                    >
                                      <FaGlobe className="h-3 w-3 text-white" />
                                    </Button>
                                  )}
                                  {detailedToken.twitter && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        openLink(detailedToken.twitter)
                                      }
                                    >
                                      <FaTwitter className="h-3 w-3 text-white" />
                                    </Button>
                                  )}
                                  {detailedToken.telegram && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        openLink(detailedToken.telegram)
                                      }
                                    >
                                      <FaTelegramPlane className="h-3 w-3 text-white" />
                                    </Button>
                                  )}
                                  {detailedToken.discord && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        openLink(detailedToken.discord)
                                      }
                                    >
                                      <FaDiscord className="h-3 w-3 text-white" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bot Info Section */}
                      <div className="space-y-4 p-4 rounded-lg bg-muted/20">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Agent Info</h3>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={bot.isActive ? "default" : "secondary"}
                            >
                              {bot.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                fetchBotLogs(bot.tokenAddress, false)
                              }
                              title="Refresh logs"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Target Growth:
                            </span>
                            <span className="font-medium">
                              {bot.targetGrowthPerHour}%/hour
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Budget:
                            </span>
                            <span className="font-medium">
                              {formatCurrency(bot.budget)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              USDT Balance:
                            </span>
                            <span className="font-medium">
                              {formatCurrency(bot.currentUsdtBalance)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Token Balance:
                            </span>
                            <span className="font-medium">
                              {formatTokenAmount(bot.currentTokenBalance)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Total Trades:
                            </span>
                            <span className="font-medium">
                              {bot.totalTrades}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Buy Volume:
                            </span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(bot.totalBuyVolume)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Sell Volume:
                            </span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(bot.totalSellVolume)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Logs Section */}
                      <div className="space-y-4 p-4 rounded-lg bg-muted/20">
                        <h3 className="text-lg font-semibold">
                          Recent Activity
                        </h3>
                        <ScrollArea className="h-64">
                          {logs.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No activity yet</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {logs.map((log, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                                >
                                  {getLogIcon(log.action)}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium capitalize">
                                        {log.action}
                                      </span>
                                      {log.success ? (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Success
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="destructive"
                                          className="text-xs"
                                        >
                                          Failed
                                        </Badge>
                                      )}
                                    </div>
                                    {log.amount && log.amount !== "0" && (
                                      <p className="text-xs text-muted-foreground">
                                        {formatCurrency(log.amount)}
                                      </p>
                                    )}
                                    {log.errorMessage && (
                                      <p className="text-xs text-red-500">
                                        {log.errorMessage}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      {formatTimeAgo(log.timestamp)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      {/* Controls Section */}
                      <div className="space-y-4 p-4 rounded-lg bg-muted/20">
                        <h3 className="text-lg font-semibold">Controls</h3>
                        <div className="space-y-3">
                          {bot.isActive ? (
                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={() =>
                                handleBotOperation(bot.tokenAddress, "stop")
                              }
                              disabled={
                                operationLoading[`${bot.tokenAddress}-stop`]
                              }
                            >
                              {operationLoading[`${bot.tokenAddress}-stop`] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Pause className="h-4 w-4" />
                              )}
                              Stop Agent
                            </Button>
                          ) : (
                            <Button
                              className="w-full gap-2"
                              onClick={() =>
                                handleBotOperation(bot.tokenAddress, "start")
                              }
                              disabled={
                                operationLoading[`${bot.tokenAddress}-start`]
                              }
                            >
                              {operationLoading[`${bot.tokenAddress}-start`] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                              Start Agent
                            </Button>
                          )}

                          <Button
                            variant="destructive"
                            className="w-full gap-2"
                            onClick={() =>
                              handleBotOperation(bot.tokenAddress, "delete")
                            }
                            disabled={
                              operationLoading[`${bot.tokenAddress}-delete`]
                            }
                          >
                            {operationLoading[`${bot.tokenAddress}-delete`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete Agent
                          </Button>

                          {bot.lastTradeAt && (
                            <div className="text-xs text-muted-foreground">
                              <p>
                                Last trade: {formatTimeAgo(bot.lastTradeAt)}
                              </p>
                            </div>
                          )}

                          {bot.nextTradeAt && bot.isActive && (
                            <div className="text-xs text-muted-foreground">
                              <p>
                                Next trade: {formatTimeAgo(bot.nextTradeAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
