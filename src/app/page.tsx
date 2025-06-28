"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function parseSitemap(xml: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const urls = Array.from(doc.getElementsByTagName("url"))
    .map((url) => url.getElementsByTagName("loc")[0]?.textContent || "")
    .filter(Boolean);
  return urls;
}

function parseSitemapIndex(xml: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const sitemaps = Array.from(doc.getElementsByTagName("sitemap"))
    .map((sm) => sm.getElementsByTagName("loc")[0]?.textContent || "")
    .filter(Boolean);
  return sitemaps;
}

async function fetchSitemaps(url: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(url)) return [];
  visited.add(url);
  try {
    const apiUrl = "/api/sitemap?url=" + encodeURIComponent(url);
    const res = await fetch(apiUrl);
    if (!res.ok) return [];
    const xml = await res.text();
    const isIndex = xml.includes("<sitemapindex");
    if (isIndex) {
      const sitemapUrls = parseSitemapIndex(xml);
      const nested = await Promise.all(sitemapUrls.map((u) => fetchSitemaps(u, visited)));
      return nested.flat();
    } else {
      return parseSitemap(xml);
    }
  } catch {
    return [];
  }
}

async function findSitemaps(baseUrl: string): Promise<string[]> {
  // Ensure baseUrl has protocol
  if (!/^https?:\/\//.test(baseUrl)) baseUrl = "https://" + baseUrl.replace(/^\/+/, "");
  baseUrl = baseUrl.replace(/\/+$/, "");

  // 1. Try robots.txt
  try {
    const robotsUrl = baseUrl + "/robots.txt";
    const res = await fetch("/api/sitemap?url=" + encodeURIComponent(robotsUrl));
    if (res.ok) {
      const text = await res.text();
      const matches = text.match(/^Sitemap:\s*(.+)$/gim);
      if (matches) {
        return matches.map(line => line.replace(/^Sitemap:\s*/i, "").trim());
      }
    }
  } catch {}

  // 2. Try common locations
  const candidates = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap1.xml",
    "/sitemap/sitemap.xml"
  ];
  for (const path of candidates) {
    try {
      const url = baseUrl + path;
      const res = await fetch("/api/sitemap?url=" + encodeURIComponent(url));
      if (res.ok) {
        const xml = await res.text();
        if (xml.includes("<urlset") || xml.includes("<sitemapindex")) {
          return [url];
        }
      }
    } catch {}
  }
  return [];
}

function toCsv(urls: string[]): string {
  return ["URL", ...urls].join("\n");
}

export default function Home() {
  const [input, setInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(urls.length / pageSize);
  const pagedUrls = urls.slice((page - 1) * pageSize, page * pageSize);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUrls([]);
    setPage(1); // Reset to first page on new search
    setLoading(true);
    try {
      const sitemapUrls = await findSitemaps(input.trim());
      if (sitemapUrls.length === 0) {
        setError("No sitemap found for this website.");
        setLoading(false);
        return;
      }
      const found = (await Promise.all(sitemapUrls.map((url) => fetchSitemaps(url)))).flat();
      setUrls(found);
      if (found.length === 0) setError("No URLs found or invalid sitemap.");
    } catch {
      setError("Failed to fetch sitemap.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const csv = toCsv(urls);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap-urls.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <span className="sr-only">Open navigation</span>
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <nav className="flex flex-col gap-2 p-4">
                <a
                  href="#"
                  className="font-semibold text-lg"
                >
                  Sitemapr
                </a>
                <a
                  href="#"
                  className="text-muted-foreground"
                >
                  Dashboard
                </a>
                <a
                  href="#"
                  className="text-muted-foreground"
                >
                  Settings
                </a>
              </nav>
            </SheetContent>
          </Sheet>
          <span className=" font-bold text-xl tracking-tight">
            Sitemapr
          </span>
          <Badge variant="secondary" className="ml-2">
            Beta
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarImage
                  src="https://i.pravatar.cc/40"
                  alt="User"
                />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {/* Dashboard Main */}
      <main className="max-w-5xl mx-auto py-10 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar (hidden on mobile) */}
        <aside className="hidden md:block col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Navigation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <a href="#" className="text-muted-foreground">Dashboard</a>
              <a href="#" className="text-muted-foreground">Settings</a>
            </CardContent>
          </Card>
        </aside>
        {/* Main Content */}
        <section className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sitemap URL Fetcher</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
                <Input
                  type="text"
                  placeholder="Enter website URL (e.g. example.com)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  required
                />
                <Button type="submit" disabled={loading}>
                  {loading ? "Loading..." : "Fetch"}
                </Button>
              </form>
              {error && <div className="text-red-500 mb-4">{error}</div>}
              {urls.length > 0 && (
                <>
                  <div className="flex justify-end items-center mb-2">
                    <Button onClick={handleDownload} variant="outline" size="sm">
                      Download CSV
                    </Button>
                  </div>
                  <Table className="border-2 border-border rounded-lg overflow-hidden">
                    <TableHeader>
                      <TableRow className="border-b-2 border-border">
                        <TableHead className="border-r-2 border-border">#</TableHead>
                        <TableHead>URL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedUrls.map((url, i) => (
                        <TableRow key={url} className="border-b border-border">
                          <TableCell className="border-r border-border">{(page - 1) * pageSize + i + 1}</TableCell>
                          <TableCell className="break-all">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">{url}</a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Prev
                    </Button>
                    <span className="text-xs">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}