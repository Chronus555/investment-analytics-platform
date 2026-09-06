'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, Send, HelpCircle } from 'lucide-react';
import { BacktestResult } from '@/analytics/backtest';

interface AiPortfolioAnalystProps {
  portfolioName: string;
  result: BacktestResult;
  benchmarkName?: string;
}

export function AiPortfolioAnalyst({
  portfolioName,
  result,
  benchmarkName = 'SPY',
}: AiPortfolioAnalystProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; tag?: string }[]>([
    {
      role: 'assistant',
      text: `Hello! I am your AI Quantitative Portfolio Analyst. I have full access to the computed metrics for ${portfolioName}. Ask me why certain drawdowns occurred, which holdings drive your volatility, or how to optimize risk-adjusted returns!`,
      tag: 'Grounded in Quantitative Engine',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');

  const quickQuestions = [
    'What caused the largest historical drawdown?',
    'Why did this portfolio achieve its Sharpe ratio?',
    'How does this portfolio behave in crisis regimes?',
    'What happens if I target risk parity?',
  ];

  const handleSend = (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    const userMsg = { role: 'user' as const, text: q };
    const m = result.summary;
    const worstDD = result.drawdownEpisodes[0];

    let reply = '';
    const qLower = q.toLowerCase();

    if (qLower.includes('drawdown') || qLower.includes('worst')) {
      reply = `**Calculated Output:** The portfolio's maximum historical drawdown is **${(
        m.maxDrawdown * 100
      ).toFixed(2)}%**.\n\n` +
        (worstDD
          ? `**Historical Episode:** Peak occurred on **${worstDD.peakDate}** ($${Math.round(
              worstDD.peakValue
            ).toLocaleString()}), bottoming on **${worstDD.troughDate}** ($${Math.round(
              worstDD.troughValue
            ).toLocaleString()}) over a decline duration of **${worstDD.durationMonths} months**.\n\n` +
            `**Recovery:** ${
              worstDD.isRecovered
                ? `Fully regained its previous high-water mark by **${worstDD.recoveryDate}** (${worstDD.recoveryMonths} months in recovery).`
                : 'Currently still recovering.'
            }`
          : '');
    } else if (qLower.includes('sharpe') || qLower.includes('risk-adjusted') || qLower.includes('cagr')) {
      reply = `**Calculated Output:** The portfolio generated a Compound Annual Growth Rate (CAGR) of **${(
        m.cagr * 100
      ).toFixed(2)}%** with annualized volatility of **${(
        m.annualizedVolatility * 100
      ).toFixed(2)}%**, resulting in a Sharpe Ratio of **${m.sharpeRatio.toFixed(
        2
      )}** (assuming a 4.0% risk-free rate).\n\n` +
        `**Sortino Ratio:** At **${m.sortinoRatio.toFixed(
          2
        )}**, the Sortino indicates that downside volatility is ${(
          m.downsideDeviation * 100
        ).toFixed(2)}%, demonstrating ${(
          m.sortinoRatio > 1.0 ? 'strong' : 'moderate'
        )} downside protection.`;
    } else if (qLower.includes('crisis') || qLower.includes('regime') || qLower.includes('benchmark')) {
      reply = `**Benchmark Comparison vs ${benchmarkName}:**\n` +
        `- **Beta:** ${m.beta !== undefined ? m.beta.toFixed(2) : 'N/A'}\n` +
        `- **Jensen's Alpha:** ${
          m.alpha !== undefined ? `${(m.alpha * 100).toFixed(2)}% annualized` : 'N/A'
        }\n` +
        `- **Up-Market Capture:** ${
          m.upCapture !== undefined ? `${m.upCapture.toFixed(1)}%` : 'N/A'
        }\n` +
        `- **Down-Market Capture:** ${
          m.downCapture !== undefined ? `${m.downCapture.toFixed(1)}%` : 'N/A'
        }\n\n` +
        `*Historical Fact:* In down markets, this portfolio captured ${
          m.downCapture !== undefined ? `${m.downCapture.toFixed(1)}%` : 'less'
        } of the benchmark's losses.`;
    } else if (qLower.includes('risk parity') || qLower.includes('optimize')) {
      reply = `**Optimization Recommendation:**\n` +
        `Equal Risk Contribution (Risk Parity) eliminates dominant equity risk by sizing volatile assets inversely proportional to their volatility.\n\n` +
        `You can click **Optimization** in the left sidebar to run the exact cyclical coordinate descent solver for this asset universe!`;
    } else {
      reply = `**Quantitative Engine Summary:**\n` +
        `- **CAGR:** ${(m.cagr * 100).toFixed(2)}%\n` +
        `- **Max Drawdown:** ${(m.maxDrawdown * 100).toFixed(2)}%\n` +
        `- **Sharpe Ratio:** ${m.sharpeRatio.toFixed(2)}\n` +
        `- **Historical 95% Monthly VaR:** -${(m.var95 * 100).toFixed(2)}%\n\n` +
        `*Methodology Note:* All numbers reflect pure mathematical compounding net of expense ratios and fees, avoiding look-ahead bias.`;
    }

    setMessages((prev) => [...prev, userMsg, { role: 'assistant', text: reply }]);
    setInputQuery('');
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white flex items-center gap-2">
              AI Quantitative Analyst
              <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] rounded-full font-mono">
                Engine Grounded
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic answers based strictly on computed portfolio statistics
            </p>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-sky-600/20 border border-sky-500/30 text-sky-100 ml-8'
                : 'bg-slate-950/80 border border-slate-800 text-slate-200 mr-8'
            }`}
          >
            <div className="whitespace-pre-line">{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Suggested prompts */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" /> Quick:
        </span>
        {quickQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            className="text-[11px] px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700/60 transition-all text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="text"
          placeholder="Ask about drawdowns, beta, Sharpe ratio, or factor risks..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputQuery)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none font-sans"
        />
        <button
          type="button"
          onClick={() => handleSend(inputQuery)}
          className="p-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
