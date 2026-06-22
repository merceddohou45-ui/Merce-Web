import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Activity, Server, Key, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

import { useConnectBroker, useGetBrokerStatus, getGetBrokerStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  broker: z.string().min(1, "Broker selection is required"),
  apiKey: z.string().min(5, "API Key is required"),
  apiSecret: z.string().min(5, "API Secret is required"),
  serverUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Connect() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: brokerStatus, isLoading: checkingStatus } = useGetBrokerStatus();
  const connectBroker = useConnectBroker();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      broker: "",
      apiKey: "",
      apiSecret: "",
      serverUrl: "",
    },
  });

  const selectedBroker = form.watch("broker");
  const isMt = selectedBroker === "MetaTrader";

  useEffect(() => {
    if (brokerStatus?.connected) {
      setLocation("/setup");
    }
  }, [brokerStatus, setLocation]);

  function onSubmit(data: FormValues) {
    connectBroker.mutate(
      { data },
      {
        onSuccess: (res) => {
          queryClient.setQueryData(getGetBrokerStatusQueryKey(), res);
          toast({
            title: "Connection Established",
            description: `Successfully connected to ${res.broker}.`,
          });
          setLocation("/setup");
        },
        onError: (err: any) => {
          toast({
            title: "Connection Failed",
            description: err.message || "Failed to verify API credentials.",
            variant: "destructive",
          });
        },
      }
    );
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary border border-secondary-border mb-6">
            <Server className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Connect Broker</h1>
          <p className="text-muted-foreground">Link your trading account to enable live signal execution and portfolio tracking.</p>
        </div>

        <Card className="border-card-border bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>We never store your funds. Read-only and trade-only permissions required.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="broker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker Platform</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select a broker..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Binance">Binance</SelectItem>
                          <SelectItem value="Bybit">Bybit</SelectItem>
                          <SelectItem value="Exness">Exness</SelectItem>
                          <SelectItem value="MetaTrader">MetaTrader (4/5)</SelectItem>
                          <SelectItem value="Forex.com">Forex.com</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Enter your API key" className="pl-10 bg-background" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="password" placeholder="Enter your API secret" className="pl-10 bg-background" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isMt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <FormField
                        control={form.control}
                        name="serverUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server URL / IP</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 192.168.1.1:443" className="bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={connectBroker.isPending}>
                  {connectBroker.isPending ? (
                    <Activity className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Connect Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <span>Bank-grade encryption end-to-end</span>
        </div>
      </motion.div>
    </div>
  );
}
