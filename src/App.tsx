import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Search, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Globe, 
  RefreshCw,
  MessageSquare,
  BarChart3,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

interface AnalysisResult {
  text: string;
  keywordAnalysis: {
    score: number;
    foundKeywords: string[];
  };
  aiAnalysis: {
    isSpam: boolean;
    confidence: number;
    reasons: string[];
    detectedKeywords: string[];
  };
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function App() {
  const [comment, setComment] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedKeywords, setScrapedKeywords] = useState<string[]>([]);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const response = await axios.get("/api/keywords");
      setKeywords(response.data);
    } catch (error) {
      toast.error("Failed to fetch keywords");
    }
  };

  const handleAnalyze = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      // 1. Keyword Analysis (Backend)
      const kwResponse = await axios.post("/api/analyze-keywords", { text: comment });
      const keywordAnalysis = kwResponse.data;

      // 2. AI Analysis (Frontend)
      const prompt = `Analyze the following comment for spam. 
      Identify if it's spam, provide a confidence score (0-100), and list specific reasons or keywords that triggered the detection.
      Return the result in JSON format: { "isSpam": boolean, "confidence": number, "reasons": string[], "detectedKeywords": string[] }
      
      Comment: "${comment}"`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      
      const aiText = aiResponse.text || "{}";
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const aiAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { isSpam: false, confidence: 0, reasons: ["AI analysis failed"] };

      setResult({
        text: comment,
        keywordAnalysis,
        aiAnalysis
      });
      toast.success("Analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    try {
      const response = await axios.post("/api/keywords", { keyword: newKeyword });
      setKeywords(response.data.keywords);
      setNewKeyword("");
      toast.success("Keyword added");
    } catch (error) {
      toast.error("Failed to add keyword");
    }
  };

  const handleDeleteKeyword = async (keyword: string) => {
    try {
      const response = await axios.delete(`/api/keywords/${keyword}`);
      setKeywords(response.data.keywords);
      toast.success("Keyword removed");
    } catch (error) {
      toast.error("Failed to remove keyword");
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    try {
      const response = await axios.post("/api/scrape", { url: scrapeUrl });
      const { words } = response.data;

      // Use AI to filter the scraped words for potential spam keywords
      const prompt = `From the following list of words scraped from a website, identify the top 10 most common words or phrases that are typically associated with spam comments.
      Return them as a JSON array of strings.
      
      Words: ${words.join(", ")}`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });

      const aiText = aiResponse.text || "[]";
      const jsonMatch = aiText.match(/\[[\s\S]*\]/);
      const newKeywords = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      setScrapedKeywords(newKeywords);
      toast.success("Scraping and AI filtering complete");
    } catch (error) {
      console.error("Scrape error:", error);
      toast.error("Scraping failed. Make sure the URL is accessible.");
    } finally {
      setIsScraping(false);
    }
  };

  const addScrapedKeyword = async (kw: string) => {
    try {
      const response = await axios.post("/api/keywords", { keyword: kw });
      setKeywords(response.data.keywords);
      setScrapedKeywords(prev => prev.filter(k => k !== kw));
      toast.success(`"${kw}" added to database`);
    } catch (error) {
      toast.error("Failed to add keyword");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xl">
          <Shield className="w-6 h-6" />
          SpamGuard AI
        </div>
        <div className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-600">
          Gemini AI Model Active
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 max-w-[1400px] mx-auto w-full">
        {/* Left Column: Analysis & Results */}
        <div className="flex flex-col gap-6">
          <Card className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <CardHeader className="px-5 py-4 border-b border-slate-200 flex flex-row justify-between items-center space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comment Analysis Input
              </CardTitle>
              <span className="text-xs text-slate-500">Max 10,000 characters</span>
            </CardHeader>
            <div className="flex-1 p-5 flex flex-col gap-4">
              <Textarea 
                placeholder="Paste comment here..." 
                className="flex-1 w-full border border-slate-200 rounded-lg p-4 font-sans text-base leading-relaxed resize-none bg-[#fafafa] focus-visible:ring-2 focus-visible:ring-blue-50 focus-visible:border-blue-600 min-h-[150px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setComment("")} 
                  className="px-6 py-2.5 rounded-md font-semibold text-sm bg-white border-slate-200"
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing || !comment.trim()}
                  className="px-6 py-2.5 rounded-md font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Run Detection Engine
                </Button>
              </div>
            </div>
          </Card>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* AI Analysis Result */}
                <div className="p-6 text-center bg-gradient-to-br from-white to-slate-100 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                  <div className={`text-5xl font-extrabold leading-none ${result.aiAnalysis.isSpam ? 'text-red-500' : 'text-green-500'}`}>
                    {result.aiAnalysis.confidence}%
                  </div>
                  <div className="text-sm text-slate-500 mt-2">Spam Probability Confidence</div>
                  <div className="h-1 w-full bg-slate-200 rounded-full mt-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${result.aiAnalysis.isSpam ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${result.aiAnalysis.confidence}%` }}
                    />
                  </div>
                  {result.aiAnalysis.reasons.length > 0 && (
                    <div className="mt-4 text-left">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Reasons:</p>
                      <ul className="space-y-1">
                        {result.aiAnalysis.reasons.map((reason, i) => (
                          <li key={i} className="text-xs flex items-start gap-2 text-slate-600">
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Keyword Analysis Result */}
                <Card className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <CardHeader className="px-5 py-4 border-b border-slate-200">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      Top Flags Found
                    </CardTitle>
                  </CardHeader>
                  <ul className="p-3 list-none">
                    {result.keywordAnalysis.foundKeywords.length > 0 ? (
                      result.keywordAnalysis.foundKeywords.map((kw, i) => (
                        <li key={i} className="flex justify-between items-center px-3 py-2 border-b border-slate-100 last:border-0 text-sm">
                          <span>{kw}</span>
                          <span className="bg-red-100 text-red-500 px-2 py-0.5 rounded font-semibold text-xs uppercase">
                            FLAGGED
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-sm text-slate-400 italic">No flagged keywords detected.</li>
                    )}
                  </ul>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Database & Tools */}
        <div className="flex flex-col gap-6">
          <Tabs defaultValue="database" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200 rounded-lg p-1">
              <TabsTrigger value="database" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-md">
                <Database className="w-4 h-4 mr-2" />
                Database
              </TabsTrigger>
              <TabsTrigger value="scrape" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 rounded-md">
                <Globe className="w-4 h-4 mr-2" />
                Scraper
              </TabsTrigger>
            </TabsList>

            <TabsContent value="database" className="mt-4">
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <CardHeader className="px-5 py-4 border-b border-slate-200 flex flex-row justify-between items-center space-y-0">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Keyword Database
                  </CardTitle>
                  <Badge variant="outline" className="font-normal text-xs">{keywords.length} items</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-4 flex gap-2 border-b border-slate-100">
                    <Input 
                      placeholder="Add keyword..." 
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                      className="h-9 border-slate-200 focus-visible:ring-blue-50 focus-visible:border-blue-600"
                    />
                    <Button size="sm" onClick={handleAddKeyword} className="bg-blue-600 hover:bg-blue-700 h-9">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <ul className="p-3 list-none">
                      {keywords.map((kw) => (
                        <li key={kw} className="group flex justify-between items-center px-3 py-2 border-b border-slate-100 last:border-0 text-sm">
                          <span className="font-medium">{kw}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteKeyword(kw)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scrape" className="mt-4">
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <CardHeader className="px-5 py-4 border-b border-slate-200">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Internet Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://example.com/blog" 
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                      className="h-9 border-slate-200 focus-visible:ring-blue-50 focus-visible:border-blue-600"
                    />
                    <Button size="sm" onClick={handleScrape} disabled={isScraping} className="bg-blue-600 hover:bg-blue-700 h-9">
                      {isScraping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    </Button>
                  </div>

                  {scrapedKeywords.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Potential Keywords Found:</p>
                      <div className="flex flex-wrap gap-2">
                        {scrapedKeywords.map((kw, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors border-slate-200 text-slate-600"
                            onClick={() => addScrapedKeyword(kw)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="h-12 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-xs text-slate-500 shrink-0 mt-auto">
        <div>System Status: <span className="text-green-500 font-medium">● Connected to Global Blacklist</span></div>
        <div>© 2024 SpamGuard AI Core</div>
      </footer>
      <Toaster position="bottom-right" />
    </div>
  );
}
