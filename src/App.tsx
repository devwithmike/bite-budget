import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

// shadcn components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Settings2, Trash2, Wallet, Download } from "lucide-react";

const CATEGORIES = ['Groceries', 'Takeout', 'Snacks', 'Other'];

export default function App() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [showSettings, setShowSettings] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  // Initialize dark mode based on system preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateDarkMode = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Set initial state
    if (darkModeQuery.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for changes
    darkModeQuery.addEventListener('change', updateDarkMode);

    return () => darkModeQuery.removeEventListener('change', updateDarkMode);
  }, []);

  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) || [];
  const budgetData = useLiveQuery(() => db.settings.get('user_budget'));
  const monthlyBudget = budgetData?.amount || 0;

  const totalSpent = transactions.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const remaining = monthlyBudget - totalSpent;

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!name || !amount) return;
    await db.transactions.add({
      shopName,
      name,
      amount: parseFloat(amount),
      category,
      date: new Date().toISOString()
    });
    setName(''); setAmount(''); setShopName('');
  };

  const deleteTransaction = async (id) => {
    if (confirm('Delete this transaction?')) {
      await db.transactions.delete(id);
    }
  };

  // swipe / long-press helpers
  const [activeSwipeId, setActiveSwipeId] = useState(null);
  const touchStartX = React.useRef(null);
  const longPressTimer = React.useRef(null);

  const handlePointerDown = (e, id) => {
    e.stopPropagation(); // prevent global listener from firing
    // used for both mouse and touch
    touchStartX.current = e.clientX;
    // start long-press timer
    longPressTimer.current = setTimeout(() => {
      setActiveSwipeId(id);
    }, 500);
  };

  const handlePointerMove = (e, id) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.clientX;
    if (delta > 75) {
      // swiped left far enough
      setActiveSwipeId(id);
      clearTimeout(longPressTimer.current);
    }
  };

  const handlePointerUp = () => {
    touchStartX.current = null;
    clearTimeout(longPressTimer.current);
  };

  const updateBudget = async () => {
    await db.settings.put({ id: 'user_budget', amount: parseFloat(tempBudget) || 0 });
    setShowSettings(false);
  };

  const clearData = async () => {
    if (confirm("Clear all data?")) {
      await db.transactions.clear();
      await db.settings.clear();
      window.location.reload();
    }
  };

  // clear active swipe whenever user interacts elsewhere
  useEffect(() => {
    const handleClick = () => setActiveSwipeId(null);
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, []);

  const exportToCSV = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const filename = `${year}-${month}.csv`;

    const headers = ['Date', 'Shop', 'Item', 'Amount', 'Category'];
    const rows = transactions.map(item => [
      new Date(item.date).toLocaleDateString('en-US'),
      item.shopName || '',
      item.name,
      item.amount.toFixed(2),
      item.category
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background pb-20 font-sans">
      <div className="max-w-md mx-auto p-4 space-y-6">

        {/* --- HERO: THE BALANCE --- */}
        <section className="pt-6 text-center">
          <h1 className={`text-6xl font-tracking-tighter font-bold mt-2 R{remaining < 0 ? 'text-destructive' : 'text-primary'}`}>
            R{remaining.toFixed(2)}
          </h1>
          <div className="flex justify-center gap-4 mt-4 text-lg font-medium text-muted-foreground">
            <div className="flex items-center gap-1"><Wallet className="w-4 h-4"/> R{monthlyBudget}</div>
            <div className="flex items-center gap-1"><PlusCircle className="w-4 h-4"/> R{totalSpent.toFixed(2)}</div>
          </div>
        </section>

        {/* --- QUICK ADD FORM --- */}
        <Card className="shadow-sm border-none bg-white/50 dark:bg-zinc-900/60 backdrop-blur-md">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium">New Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTransaction} className="space-y-4">
              <div className="space-y-1.5">
                <Input
                  placeholder="Shop name"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Input
                    placeholder="Item name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    placeholder="R0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" className="px-8">Add</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* --- TRANSACTION LIST --- */}
        <div className="space-y-3 mt-10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">History</h3>
          <div className="space-y-2">
            {transactions.map(item => (
              <div key={item.id} className="relative select-none">
                <Card
                  className="shadow-none border-zinc-200 dark:border-zinc-700"
                  onPointerDown={(e) => handlePointerDown(e, item.id)}
                  onPointerMove={(e) => handlePointerMove(e, item.id)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.shopName && <span>{item.shopName} • </span>}
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {item.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground/70">-R{item.amount.toFixed(2)}</span>
                      {activeSwipeId === item.id && (
                        <button
                          className="text-destructive"
                          onClick={() => deleteTransaction(item.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* --- SETTINGS SECTION --- */}
        <Separator className="my-8" />
        <footer className="flex flex-col items-center gap-6">
          {showSettings ? (
            <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-bottom-2">
              <Label htmlFor="budget">Total Monthly Budget</Label>
              <div className="flex gap-2">
                <Input
                  id="budget"
                  type="number"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                />
                <Button onClick={updateBudget}>Save</Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="text-muted-foreground">
              <Settings2 className="w-4 h-4 mr-2" /> Adjust Budget
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={exportToCSV} className="text-muted-foreground">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>

          <Button variant="link" onClick={clearData} className="text-destructive/50 text-xs hover:text-destructive">
            <Trash2 className="w-3 h-3 mr-2" /> Reset Everything
          </Button>
        </footer>
      </div>
    </div>
  );
}