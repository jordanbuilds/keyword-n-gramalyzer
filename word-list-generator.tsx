'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

type WordData = {
  text: string
  value: number
  metrics: (number | null)[]
}

type MetricConfig = {
  name: string
  calculationType: 'SUM' | 'AVG'
  enabled: boolean
}

type RawWordData = {
  [key: string]: { 
    count: number
    metrics: (number[] | null)[]
  }
}

export default function WordListGenerator() {
  const [words, setWords] = useState<WordData[]>([])
  const [rawInput, setRawInput] = useState<string[][]>([])
  const [error, setError] = useState<string | null>(null)
  const [metricConfigs, setMetricConfigs] = useState<MetricConfig[]>([
    { name: 'Clicks', calculationType: 'SUM', enabled: true },
    { name: 'Impressions', calculationType: 'SUM', enabled: true },
    { name: 'CTR', calculationType: 'AVG', enabled: true },
    { name: 'Position', calculationType: 'AVG', enabled: true },
  ])
  const [nGram, setNGram] = useState<number>(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inputText, setInputText] = useState<string>('')

  const generateNGrams = (words: string[], n: number): string[] => {
    const nGrams: string[] = []
    for (let i = 0; i <= words.length - n; i++) {
      nGrams.push(words.slice(i, i + n).join(' '))
    }
    return nGrams
  }

  const processWords = useCallback(() => {
    const wordData: RawWordData = {}

    rawInput.forEach((row) => {
      const [keywords, ...metricStrings] = row
      const metrics = metricStrings.map(m => parseFloat(m))

      if (metrics.some(m => isNaN(m))) {
        setError('Invalid metrics found. Please ensure all provided metrics are valid numbers.')
        return
      }

      const wordsInLine = keywords.toLowerCase().split(/\s+/)
      const nGrams = generateNGrams(wordsInLine, nGram)
      nGrams.forEach(gram => {
        if (!wordData[gram]) {
          wordData[gram] = { count: 0, metrics: metricConfigs.map(() => []) }
        }
        wordData[gram].count += 1
        metrics.forEach((metric, index) => {
          (wordData[gram].metrics[index] as number[]).push(metric)
        })
      })
    })

    const parsedWords = Object.entries(wordData).map(([text, data]) => ({
      text,
      value: data.count,
      metrics: metricConfigs.map((config, index) => {
        if (!config.enabled || !data.metrics[index]) return null
        const values = data.metrics[index] as number[]
        return config.calculationType === 'SUM'
          ? values.reduce((a, b) => a + b, 0)
          : values.reduce((a, b) => a + b, 0) / values.length
      })
    }))

    if (parsedWords.length === 0) {
      setError('No valid words found in the input.')
      setWords([])
    } else {
      setWords(parsedWords.sort((a, b) => {
        const metricIndex = metricConfigs.findIndex(config => config.enabled)
        if (metricIndex === -1) return b.value - a.value
        return (b.metrics[metricIndex] ?? 0) - (a.metrics[metricIndex] ?? 0)
      }))
      setError(null)
    }
  }, [metricConfigs, nGram, rawInput])

  const handleTextInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = event.target.value
    setInputText(input)
    const lines = input.split('\n')

    // Skip the header row and process the rest
    const processedInput = lines.slice(1).map(line => line.split('\t'))
    setRawInput(processedInput)
  }, [])

  useEffect(() => {
    if (rawInput.length > 0) {
      processWords()
    }
  }, [rawInput, processWords])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setInputText(content)
      handleTextInput({ target: { value: content } } as React.ChangeEvent<HTMLTextAreaElement>)
    }
    reader.readAsText(file)
  }, [handleTextInput])

  const handleClear = useCallback(() => {
    setWords([])
    setRawInput([])
    setError(null)
    setInputText('')
    setNGram(1)
    setMetricConfigs([
      { name: 'Clicks', calculationType: 'SUM', enabled: true },
      { name: 'Impressions', calculationType: 'SUM', enabled: true },
      { name: 'CTR', calculationType: 'AVG', enabled: true },
      { name: 'Position', calculationType: 'AVG', enabled: true },
    ])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleExportCSV = useCallback(() => {
    if (words.length === 0) {
      setError('No data to export. Please generate a word list first.')
      return
    }

    const enabledMetrics = metricConfigs.filter(config => config.enabled)
    const csvContent = "data:text/csv;charset=utf-8," 
      + `${nGram}-Gram,Count,${enabledMetrics.map(config => `${config.calculationType} of ${config.name}`).join(',')}\n`
      + words.map(word => 
          `${word.text},${word.value},${word.metrics
            .filter((_, index) => metricConfigs[index].enabled)
            .map(m => m !== null ? m.toFixed(4) : '')
            .join(',')}`
        ).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${nGram}-gram_frequency_and_metrics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [words, metricConfigs, nGram])

  const handleMetricConfigChange = useCallback((index: number, field: 'name' | 'calculationType' | 'enabled', value: string | boolean) => {
    setMetricConfigs(prevConfigs => prevConfigs.map((config, i) => 
      i === index ? { ...config, [field]: value } : config
    ))
  }, [])

  const handleReCalculate = useCallback(() => {
    if (rawInput.length > 0) {
      processWords()
    } else {
      setError('No data to re-calculate. Please input data or upload a file first.')
    }
  }, [rawInput, processWords])

  const handleNGramChange = useCallback((value: string) => {
    const n = parseInt(value, 10)
    setNGram(n)
  }, [])

  useEffect(() => {
    if (rawInput.length > 0) {
      processWords()
    }
  }, [nGram, metricConfigs, processWords, rawInput])

  return (
    <div className="container mx-auto p-4 dark:bg-gray-900 dark:text-gray-100">
      <Card className="mb-4 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Keyword N-Gramalyzer</CardTitle>
          <p className="text-sm text-muted-foreground dark:text-gray-400">A smart way to analyze keywords at scale</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-input">Enter keywords and metrics (paste from spreadsheet):</Label>
              <Textarea
                id="text-input"
                placeholder="Paste your data here, including the header row. Format: 'Top queries [tab] Clicks [tab] Impressions [tab] CTR [tab] Position'"
                onChange={handleTextInput}
                value={inputText}
                className="mt-1 font-mono"
                rows={10}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 border rounded-lg">
                <Label htmlFor="n-gram">N-Gram:</Label>
                <Select value={nGram.toString()} onValueChange={handleNGramChange}>
                  <SelectTrigger id="n-gram">
                    <SelectValue placeholder="Select N-Gram" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1-Gram (Single Words)</SelectItem>
                    <SelectItem value="2">2-Gram (Word Pairs)</SelectItem>
                    <SelectItem value="3">3-Gram (Word Triplets)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {metricConfigs.map((config, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`metric${index + 1}-enabled`}>{`${config.name} Enabled:`}</Label>
                    <Switch
                      id={`metric${index + 1}-enabled`}
                      checked={config.enabled}
                      onCheckedChange={(checked) => handleMetricConfigChange(index, 'enabled', checked)}
                    />
                  </div>
                  <Label htmlFor={`metric${index + 1}-name`}>{`${config.name} Name:`}</Label>
                  <Input
                    id={`metric${index + 1}-name`}
                    value={config.name}
                    onChange={(e) => handleMetricConfigChange(index, 'name', e.target.value)}
                    disabled={!config.enabled}
                  />
                  <Label htmlFor={`metric${index + 1}-type`}>{`${config.name} Calculation:`}</Label>
                  <Select
                    value={config.calculationType}
                    onValueChange={(value) => handleMetricConfigChange(index, 'calculationType', value as 'SUM' | 'AVG')}
                    disabled={!config.enabled}
                  >
                    <SelectTrigger id={`metric${index + 1}-type`}>
                      <SelectValue placeholder="Select calculation type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUM">SUM</SelectItem>
                      <SelectItem value="AVG">AVG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="file-upload">Or upload a TSV file:</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".tsv,.txt"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="mt-1"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleClear}>Clear</Button>
              <Button onClick={handleReCalculate} variant="secondary">Re-Calculate</Button>
              <Button onClick={handleExportCSV} variant="outline">Export CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4 dark:bg-red-900 dark:border-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {words.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 {nGram}-Grams</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="dark:border-gray-700">
                  <TableHead className="dark:text-gray-300">{nGram}-Gram</TableHead>
                  <TableHead className="dark:text-gray-300">Count</TableHead>
                  {metricConfigs.filter(config => config.enabled).map((config, index) => (
                    <TableHead key={index} className="dark:text-gray-300">{`${config.calculationType} of ${config.name}`}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {words.slice(0, 10).map((word, index) => (
                  <TableRow key={index} className="dark:border-gray-700">
                    <TableCell className="dark:text-gray-300">{word.text}</TableCell>
                    <TableCell className="dark:text-gray-300">{word.value}</TableCell>
                    {word.metrics.filter((_, i) => metricConfigs[i].enabled).map((metric, i) => (
                      <TableCell key={i} className="dark:text-gray-300">{metric !== null ? metric.toFixed(4) : 'N/A'}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}