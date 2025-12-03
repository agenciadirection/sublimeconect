import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Gift, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  Smartphone,
  QrCode,
  MessageCircle,
  Award,
  Star,
  Calendar,
  Filter,
  Download,
  Send,
  TestTube,
  Phone,
  UserPlus,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Componente de Card de Estatística
const StatCard = ({ title, value, icon: Icon, description, trend, color = "primary" }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}) => (
  <Card className="relative overflow-hidden bg-neutral-800/70 backdrop-blur-[20px] border border-white/10 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg bg-${color}-500/20`}>
            <Icon className={`h-6 w-6 text-${color}-400`} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">{title}</p>
            <p className="text-2xl font-bold text-neutral-200">{value}</p>
            {description && (
              <p className="text-xs text-neutral-500 mt-1">{description}</p>
            )}
          </div>
        </div>
        {trend && (
          <Badge variant={trend.isPositive ? "default" : "destructive"} className="text-xs">
            {trend.isPositive ? "+" : ""}{trend.value}%
          </Badge>
        )}
      </div>
    </CardContent>
  </Card>
);

// Componente de Modal de QR Code
const QRCodeModal = ({ customer, isOpen, onClose }: {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-md bg-neutral-800 border-neutral-700">
      <DialogHeader>
        <DialogTitle className="text-neutral-200">QR Code - {customer?.name}</DialogTitle>
        <DialogDescription className="text-neutral-400">
          Use este QR Code para identificar o cliente rapidamente
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center space-y-4 p-6">
        {customer?.qrCode ? (
          <img 
            src={customer.qrCode} 
            alt="QR Code" 
            className="w-48 h-48 border-2 border-neutral-600 rounded-lg"
          />
        ) : (
          <div className="w-48 h-48 border-2 border-dashed border-neutral-600 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <QrCode className="h-12 w-12 text-neutral-500 mx-auto mb-2" />
              <p className="text-neutral-500">QR Code não disponível</p>
            </div>
          </div>
        )}
        <div className="text-center">
          <p className="font-medium text-neutral-200">{customer?.name}</p>
          <p className="text-sm text-neutral-400">{customer?.phone}</p>
        </div>
        <Button onClick={onClose} variant="outline" className="w-full">
          Fechar
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

// Componente de Modal de Adicionar Selos
const AddStampsModal = ({ customer, isOpen, onClose, onSubmit }: {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stamps: number, vendedor: string) => void;
}) => {
  const [stamps, setStamps] = useState(1);
  const [vendedor, setVendedor] = useState('');

  const handleSubmit = () => {
    if (stamps <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    onSubmit(stamps, vendedor);
    setStamps(1);
    setVendedor('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-neutral-800 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-neutral-200">Adicionar Selos</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Adicionar selos para {customer?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Quantidade de Selos
            </label>
            <Input
              type="number"
              value={stamps}
              onChange={(e) => setStamps(parseInt(e.target.value) || 0)}
              placeholder="Ex: 1, 2, 3..."
              min="1"
              className="bg-neutral-700 border-neutral-600 text-neutral-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Vendedor
            </label>
            <Input
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              placeholder="Nome do vendedor"
              className="bg-neutral-700 border-neutral-600 text-neutral-200"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-primary-500 hover:bg-primary-600">
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Função para determinar nível do cliente
const getCustomerLevel = (customer: any) => {
  if (!customer.lastVisit) return { name: "Bronze", color: "yellow", emoji: "🥉" };
  
  const lastVisitDate = new Date(customer.lastVisit);
  const today = new Date();
  const daysSinceVisit = Math.floor((today.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceVisit <= 7) return { name: "Ouro", color: "amber", emoji: "🥇" };
  if (daysSinceVisit <= 15) return { name: "Prata", color: "gray", emoji: "🥈" };
  if (daysSinceVisit <= 60) return { name: "Bronze", color: "yellow", emoji: "🥉" };
  return { name: "Inativo", color: "red", emoji: "⚠️" };
};

export default function Loyalty() {
  // Estados principais
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isAddStampsOpen, setIsAddStampsOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
  const [filters, setFilters] = useState({
    vendedor: "",
    perfil: "",
    dateFrom: "",
    dateTo: ""
  });

  // Query hooks
  const { data: dashboardStats, isLoading: statsLoading } = trpc.loyalty.getDashboardStats.useQuery();
  const { data: customers, refetch: refetchCustomers, isLoading: customersLoading } = trpc.loyalty.getCustomers.useQuery({
    search: searchPhone,
    vendedor: filters.vendedor,
    perfil: filters.perfil,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  // Mutations
  const createCustomerMutation = trpc.loyalty.createCustomer.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      setNewCustomer({ name: "", phone: "", email: "" });
      refetchCustomers();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao criar cliente");
    },
  });

  const addStampsMutation = trpc.loyalty.addStamps.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.stampsAdded} selos adicionados com sucesso!`);
      refetchCustomers();
      setIsAddStampsOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao adicionar selos");
    },
  });

  const redeemPrizeMutation = trpc.loyalty.redeemPrize.useMutation({
    onSuccess: () => {
      toast.success("Prêmio resgatado com sucesso!");
      refetchCustomers();
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao resgatar prêmio");
    },
  });

  const generateQRCodeMutation = trpc.loyalty.generateCustomerQRCode.useMutation({
    onSuccess: (result) => {
      toast.success("QR Code gerado com sucesso!");
      setSelectedCustomer((prev: any) => ({ ...prev, qrCode: result.qrCode }));
      setIsQRCodeOpen(true);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao gerar QR Code");
    },
  });

  const testZAPIMutation = trpc.loyalty.testZAPIConnection.useMutation({
    onSuccess: () => {
      toast.success("Conexão Z-API funcionando!");
    },
    onError: (error: any) => {
      toast.error(`Erro Z-API: ${error.message}`);
    },
  });

  // Funções auxiliares
  const handleSearchCustomer = () => {
    if (!searchPhone) return;
    
    const found = customers?.find((c: any) => c.phone === searchPhone);
    if (found) {
      setSelectedCustomer(found);
      toast.success("Cliente encontrado!");
    } else {
      toast.error("Cliente não encontrado");
    }
  };

  const handleCreateCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    createCustomerMutation.mutate({
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
    });
  };

  const handleAddStamps = (stamps: number, vendedor: string) => {
    if (!selectedCustomer) return;

    addStampsMutation.mutate({
      customerId: selectedCustomer.id,
      stamps,
      vendedor,
      reason: "venda",
    });
  };

  const handleRedeemPrize = async () => {
    if (!selectedCustomer || selectedCustomer.selos < 10) {
      toast.error("Cliente precisa de 10 selos para resgatar");
      return;
    }

    try {
      await redeemPrizeMutation.mutateAsync({
        customerId: selectedCustomer.id,
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao resgatar prêmio");
    }
  };

  const handleGenerateQRCode = () => {
    if (!selectedCustomer) return;
    generateQRCodeMutation.mutate({ customerId: selectedCustomer.id });
  };

  // Dados calculados
  const topCustomers = useMemo(() => {
    if (!customers) return [];
    return [...customers]
      .sort((a: any, b: any) => (b.selos || 0) - (a.selos || 0))
      .slice(0, 10);
  }, [customers]);

  const levelStats = useMemo(() => {
    if (!customers) return { new_client: 0, casual: 0, lover: 0, total: 0 };
    
    const stats = { new_client: 0, casual: 0, lover: 0, total: customers.length };
    customers.forEach((customer: any) => {
      if (customer.perfil in stats) {
        stats[customer.perfil as keyof typeof stats]++;
      }
    });
    return stats;
  }, [customers]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(138,43,226,0.15),transparent_40%)]"></div>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-200">
          Sistema de Fidelidade Integrado
        </h1>
        <p className="text-neutral-400 mt-1">
          Gerencie clientes, selos, prêmios e campanhas automatizadas
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="grid w-full grid-cols-6 bg-neutral-800/50 border border-white/10">
          <TabsTrigger value="dashboard" className="text-neutral-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            📊 Dashboard
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-neutral-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            👥 Clientes
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-neutral-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            💬 Campanhas
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-neutral-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            📈 Relatórios
          </TabsTrigger>
          <TabsTrigger value="automation" className="text-neutral-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            🤖 Automação
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-neutral-300 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
            ⚙️ Config
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total de Clientes"
              value={dashboardStats?.totalCustomers || 0}
              icon={Users}
              description="Clientes ativos no programa"
              trend={{ value: 12, isPositive: true }}
              color="primary"
            />
            <StatCard
              title="Selos Emitidos"
              value={dashboardStats?.totalStamps || 0}
              icon={Award}
              description="Total de selos no sistema"
              trend={{ value: 8, isPositive: true }}
              color="secondary"
            />
            <StatCard
              title="Prêmios/Mês"
              value={dashboardStats?.prizesRedeemedThisMonth || 0}
              icon={Gift}
              description="Resgates este mês"
              trend={{ value: 15, isPositive: true }}
              color="success"
            />
            <StatCard
              title="Receita Total"
              value={`R$ ${(dashboardStats?.totalRevenue || 0).toLocaleString('pt-BR')}`}
              icon={TrendingUp}
              description="Faturamento clientes fidelidade"
              trend={{ value: 23, isPositive: true }}
              color="warning"
            />
          </div>

          {/* Quick Actions */}
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-400" />
                Ações Rápidas
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Funcionalidades mais utilizadas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                onClick={() => setActiveTab("customers")} 
                className="h-auto p-4 flex-col gap-2 bg-primary-500 hover:bg-primary-600"
              >
                <UserPlus className="h-6 w-6" />
                <span>Novo Cliente</span>
              </Button>
              
              <Button 
                onClick={() => setActiveTab("campaigns")} 
                className="h-auto p-4 flex-col gap-2 bg-secondary-500 hover:bg-secondary-600"
              >
                <Send className="h-6 w-6" />
                <span>Nova Campanha</span>
              </Button>
              
              <Button 
                onClick={() => testZAPIMutation.mutate()} 
                variant="outline" 
                className="h-auto p-4 flex-col gap-2 border-neutral-600"
              >
                <TestTube className="h-6 w-6" />
                <span>Testar Z-API</span>
              </Button>
              
              <Button 
                onClick={() => setActiveTab("reports")} 
                variant="outline" 
                className="h-auto p-4 flex-col gap-2 border-neutral-600"
              >
                <BarChart3 className="h-6 w-6" />
                <span>Ver Relatórios</span>
              </Button>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" />
                Top 10 Clientes
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Clientes com mais selos acumulados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {topCustomers.map((customer: any, index: number) => {
                    const level = getCustomerLevel(customer);
                    return (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg hover:bg-neutral-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-primary-400">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-neutral-200">{customer.name}</p>
                            <p className="text-sm text-neutral-400">{customer.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`bg-${level.color}-500/20 text-${level.color}-400 border-${level.color}-500/50`}>
                              {level.emoji} {level.name}
                            </Badge>
                          </div>
                          <p className="font-semibold text-neutral-200">{customer.selos} selos</p>
                          <p className="text-xs text-neutral-500">{customer.visitas} visitas</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-neutral-500 py-8">Nenhum cliente encontrado</p>
              )}
            </CardContent>
          </Card>

          {/* Level Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🥉</div>
                <h3 className="text-xl font-semibold text-yellow-400">Bronze</h3>
                <p className="text-2xl font-bold text-neutral-200 mt-2">
                  {levelStats.new_client}
                </p>
                <p className="text-sm text-neutral-400">Novos clientes</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-gray-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🥈</div>
                <h3 className="text-xl font-semibold text-gray-400">Prata</h3>
                <p className="text-2xl font-bold text-neutral-200 mt-2">
                  {levelStats.casual}
                </p>
                <p className="text-sm text-neutral-400">Clientes casuais</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🥇</div>
                <h3 className="text-xl font-semibold text-amber-400">Ouro</h3>
                <p className="text-2xl font-bold text-neutral-200 mt-2">
                  {levelStats.lover}
                </p>
                <p className="text-sm text-neutral-400">Fieis ao cliente</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-6 mt-6">
          {/* Search and Filter */}
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <Search className="h-5 w-5 text-primary-400" />
                Buscar Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="tel"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="flex-1 bg-neutral-700 border-neutral-600 text-neutral-200"
                />
                <Button onClick={handleSearchCustomer} className="bg-primary-500 hover:bg-primary-600">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-neutral-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-neutral-800 border-neutral-700">
                    <DialogHeader>
                      <DialogTitle className="text-neutral-200">Novo Cliente</DialogTitle>
                      <DialogDescription className="text-neutral-400">
                        Cadastrar um novo cliente no programa de fidelidade
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 p-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Nome *</label>
                        <Input
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome do cliente"
                          className="bg-neutral-700 border-neutral-600 text-neutral-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Telefone *</label>
                        <Input
                          type="tel"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          className="bg-neutral-700 border-neutral-600 text-neutral-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
                        <Input
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@exemplo.com"
                          className="bg-neutral-700 border-neutral-600 text-neutral-200"
                        />
                      </div>
                      <Button 
                        onClick={handleCreateCustomer}
                        disabled={createCustomerMutation.isPending}
                        className="w-full bg-primary-500 hover:bg-primary-600"
                      >
                        {createCustomerMutation.isPending ? "Criando..." : "Criar Cliente"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Selected Customer */}
          {selectedCustomer && (
            <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
              <CardHeader>
                <CardTitle className="text-neutral-200">{selectedCustomer.name}</CardTitle>
                <CardDescription className="text-neutral-400">{selectedCustomer.phone}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const level = getCustomerLevel(selectedCustomer);
                    return (
                      <>
                        <div className="p-3 bg-neutral-700/30 rounded-lg">
                          <p className="text-xs text-neutral-400">Nível</p>
                          <p className={`text-lg font-bold text-${level.color}-400`}>
                            {level.emoji} {level.name}
                          </p>
                        </div>
                        <div className="p-3 bg-neutral-700/30 rounded-lg">
                          <p className="text-xs text-neutral-400">Selos</p>
                          <p className="text-lg font-bold text-neutral-200">{selectedCustomer.selos}</p>
                        </div>
                        <div className="p-3 bg-neutral-700/30 rounded-lg">
                          <p className="text-xs text-neutral-400">Total Gasto</p>
                          <p className="text-lg font-bold text-neutral-200">
                            R$ {(selectedCustomer.valorTotal || 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="p-3 bg-neutral-700/30 rounded-lg">
                          <p className="text-xs text-neutral-400">Prêmios</p>
                          <p className="text-lg font-bold text-neutral-200">{selectedCustomer.resgatados || 0}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-neutral-200">Progresso para Próximo Prêmio</p>
                    <p className="text-sm text-neutral-400">{selectedCustomer.selos}/10 selos</p>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-400 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min((selectedCustomer.selos / 10) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {selectedCustomer.selos < 10 && (
                    <p className="text-xs text-neutral-500 text-center">
                      Faltam {10 - selectedCustomer.selos} selos para resgatar um prêmio
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    onClick={() => setIsAddStampsOpen(true)}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Selos
                  </Button>
                  
                  {selectedCustomer.selos >= 10 && (
                    <Button 
                      onClick={handleRedeemPrize}
                      disabled={redeemPrizeMutation.isPending}
                      className="bg-success-500 hover:bg-success-600"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      {redeemPrizeMutation.isPending ? "Resgatando..." : "Resgatar Prêmio"}
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleGenerateQRCode}
                    variant="outline"
                    className="border-neutral-600"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer List */}
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-400" />
                Lista de Clientes ({customers?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              ) : customers && customers.length > 0 ? (
                <div className="space-y-2">
                  {customers.map((customer: any) => {
                    const level = getCustomerLevel(customer);
                    return (
                      <div 
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-3 bg-neutral-700/20 rounded-lg hover:bg-neutral-700/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-neutral-200">{customer.name}</p>
                            <p className="text-sm text-neutral-400">{customer.phone}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={`bg-${level.color}-500/20 text-${level.color}-400 border-${level.color}-500/50 mb-1`}>
                              {level.emoji} {level.name}
                            </Badge>
                            <p className="text-sm font-semibold text-neutral-200">{customer.selos} selos</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-neutral-500 py-8">Nenhum cliente encontrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outras tabs campanhas, relatórios, etc. */}
        <TabsContent value="campaigns" className="space-y-6 mt-6">
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary-400" />
                Campanhas WhatsApp
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Gerencie campanhas automatizadas via Z-API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <MessageCircle className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-400 mb-4">Em desenvolvimento</p>
                <p className="text-sm text-neutral-500">Funcionalidades de campanhas serão implementadas aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 mt-6">
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-400" />
                Relatórios e Analytics
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Visualize dados detalhados do programa de fidelidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-400 mb-4">Em desenvolvimento</p>
                <p className="text-sm text-neutral-500">Gráficos e relatórios detalhados serão implementados aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6 mt-6">
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-400" />
                Automação e Regras
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Configure automações inteligentes do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Zap className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-400 mb-4">Em desenvolvimento</p>
                <p className="text-sm text-neutral-500">Sistema de automações será implementado aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="bg-neutral-800/70 backdrop-blur-[20px] border border-white/10">
            <CardHeader>
              <CardTitle className="text-neutral-200 flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary-400" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Configure preferências e integrações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-400 mb-4">Em desenvolvimento</p>
                <p className="text-sm text-neutral-500">Configurações avançadas serão implementadas aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <QRCodeModal
        customer={selectedCustomer}
        isOpen={isQRCodeOpen}
        onClose={() => setIsQRCodeOpen(false)}
      />

      <AddStampsModal
        customer={selectedCustomer}
        isOpen={isAddStampsOpen}
        onClose={() => setIsAddStampsOpen(false)}
        onSubmit={handleAddStamps}
      />
    </div>
  );
}