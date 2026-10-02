"use client"
import React from "react"

export class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback?: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-500 bg-red-50 text-red-900 rounded-md m-4">
          <h2 className="font-bold">Something went wrong rendering this component.</h2>
          <pre className="text-sm mt-2 whitespace-pre-wrap">{this.state.error?.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
