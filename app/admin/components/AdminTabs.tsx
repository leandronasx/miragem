"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardUploadTab } from "@/app/admin/tabs/CardUploadTab";
import { DeliveryTab } from "@/app/admin/tabs/DeliveryTab";
import { AccountManagementTab } from "@/app/admin/tabs/AccountManagementTab";

interface AdminTabsProps {
  initialVideos: any[];
  initialProfiles: any[];
  initialGenerations: any[];
}

export function AdminTabs({ initialVideos, initialProfiles, initialGenerations }: AdminTabsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Painel Administrativo</h1>
        <p className="text-zinc-400 mt-2">Gerencie o sistema Miragem</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
          <TabsTrigger 
            value="upload" 
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-300"
          >
            Upload de Cards
          </TabsTrigger>
          <TabsTrigger 
            value="delivery" 
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-300"
          >
            Entrega de Gerações
          </TabsTrigger>
          <TabsTrigger 
            value="accounts" 
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-300"
          >
            Gerenciamento de Contas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <CardUploadTab initialVideos={initialVideos} />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <DeliveryTab initialGenerations={initialGenerations} />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <AccountManagementTab initialProfiles={initialProfiles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
