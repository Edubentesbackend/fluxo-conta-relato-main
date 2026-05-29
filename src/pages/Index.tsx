import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionForm } from '@/components/TransactionForm';
import { AccountImport } from '@/components/AccountImport';
import { NewReportsDashboard } from '@/components/reports/NewReportsDashboard';
import { UserAccountMenu } from '@/components/UserAccountMenu';
import { TrendingUp, Plus, Upload, BarChart3, Sparkles } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex justify-end">
          <UserAccountMenu />
        </div>

        {/* Hero Header */}
        <div className="relative mb-12 text-center">
          <div className="absolute inset-0 gradient-primary opacity-5 rounded-3xl blur-3xl"></div>
          <div className="relative gradient-card rounded-3xl p-8 shadow-large hover-lift">
            <div className="flex items-center justify-center mb-4">
              <div className="gradient-primary p-3 rounded-2xl shadow-glow">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <Sparkles className="h-6 w-6 text-primary ml-2 animate-bounce-subtle" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-support bg-clip-text text-transparent animate-slide-up">
              Sistema de Transações
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-delayed">
              Gerencie transações entre contas e gere relatórios inteligentes com analytics avançados
            </p>
          </div>
        </div>

        <Tabs defaultValue="transactions" className="space-y-8">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 p-2 gradient-card shadow-soft rounded-2xl border-0 gap-2 sm:gap-0">
            <TabsTrigger 
              value="transactions" 
              className="flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              Nova Transação
            </TabsTrigger>
            <TabsTrigger 
              value="import"
              className="flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 data-[state=active]:gradient-accent data-[state=active]:text-white data-[state=active]:shadow-glow hover:scale-105"
            >
              <Upload className="h-5 w-5" />
              Importar Contas
            </TabsTrigger>
            <TabsTrigger 
              value="reports"
              className="flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 data-[state=active]:gradient-support data-[state=active]:text-white data-[state=active]:shadow-glow hover:scale-105"
            >
              <BarChart3 className="h-5 w-5" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6 animate-scale-in">
            <Card className="gradient-card shadow-medium border-0 overflow-hidden hover-lift">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Plus className="h-5 w-5" />
                  Nova Transação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TransactionForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6 animate-scale-in">
            <Card className="gradient-card shadow-medium border-0 overflow-hidden hover-lift">
              <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10 border-b border-accent/10">
                <CardTitle className="flex items-center gap-2 text-accent">
                  <Upload className="h-5 w-5" />
                  Importar Contas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AccountImport />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6 animate-scale-in">
            <NewReportsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
