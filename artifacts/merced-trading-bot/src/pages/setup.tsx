import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Target, TrendingUp, Clock, Activity, ArrowRight, ShieldAlert } from "lucide-react";

import { useGetProfile, useSaveProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  capital: z.coerce.number().min(10, "Minimum capital is $10"),
  profitTargetPercent: z.coerce.number().min(1, "Target must be > 0"),
  riskLevel: z.string().min(1, "Risk level required"),
  timeframe: z.string().min(1, "Timeframe required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Setup() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading } = useGetProfile();
  const saveProfile = useSaveProfile();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      capital: 1000,
      profitTargetPercent: 20,
      riskLevel: "MEDIUM",
      timeframe: "H1",
    },
  });

  useEffect(() => {
    if (profile) {
      if (profile.capital) {
        // If profile already completely setup, redirect
        setLocation("/dashboard");
      }
    }
  }, [profile, setLocation]);

  function onSubmit(data: FormValues) {
    const profitTarget = data.capital * (data.profitTargetPercent / 100);
    
    saveProfile.mutate(
      { 
        data: {
          ...data,
          profitTarget
        } 
      },
      {
        onSuccess: (res) => {
          queryClient.setQueryData(getGetProfileQueryKey(), res);
          toast({
            title: "Profile Configured",
            description: "Your trading parameters have been saved.",
          });
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast({
            title: "Setup Failed",
            description: err.message || "Failed to save profile.",
            variant: "destructive",
          });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="h-8 w-8 text-accent animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary border border-secondary-border mb-6">
            <Target className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Trading Parameters</h1>
          <p className="text-muted-foreground">Define your risk appetite and goals to calibrate the signal engine.</p>
        </div>

        <Card className="border-card-border bg-card/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Strategy Setup</CardTitle>
            <CardDescription>These settings will filter and size your signals automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="capital"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          Trading Capital (USD)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1000" className="bg-background text-lg font-mono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profitTargetPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          Profit Target (%)
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select target" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="10">+10%</SelectItem>
                            <SelectItem value="20">+20%</SelectItem>
                            <SelectItem value="50">+50%</SelectItem>
                            <SelectItem value="100">+100%</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                          Risk Level
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select risk level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low (Conservative)</SelectItem>
                            <SelectItem value="MEDIUM">Medium (Balanced)</SelectItem>
                            <SelectItem value="HIGH">High (Aggressive)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Primary Timeframe
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M1">1 Minute (Scalping)</SelectItem>
                            <SelectItem value="M5">5 Minutes</SelectItem>
                            <SelectItem value="M15">15 Minutes</SelectItem>
                            <SelectItem value="H1">1 Hour (Day Trading)</SelectItem>
                            <SelectItem value="H4">4 Hours (Swing)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <Button type="submit" className="w-full h-12 text-md" disabled={saveProfile.isPending}>
                    {saveProfile.isPending ? (
                      <Activity className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Initialize War Room
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
