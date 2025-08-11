import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
    UploadCloud, FileText, ListCollapse, Folder, Clock, Settings, CheckCircle, XCircle, 
    ChevronDown, ChevronUp, ChevronRight, Search, Send as SendIcon, Copy, AlertTriangle,
    Users, Activity, BarChart3, Target, Zap, Eye, Download,
    Bell, User, Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';

// API base URL - use environment variable or fallback to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ba-agent-sldc-backend.vercel.app';

// React Error Boundary to catch DOM manipulation errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-600 text-sm">
            The application encountered an error. Please refresh the page to continue.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Enhanced Helper Components ---

function MarkdownRenderer({ markdown, title, className = "" }) {
  const sanitizedMarkdown = markdown || 'No content generated.';
  return (
    <div className={`prose prose-slate max-w-none p-6 bg-white rounded-lg shadow-lg border ${className}`}>
      {title && <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-6 h-6" />
        {title}
      </h2>}
      <ReactMarkdown>{sanitizedMarkdown}</ReactMarkdown>
    </div>
  );
}

// Enhanced Mermaid Diagram with better error handling and loading states
function MermaidDiagram({ code, id, showDownloadPng, showPngInline, title }) {
  const containerRef = useRef(null);
  const [pngUrl, setPngUrl] = useState(null);
  const [loadingPng, setLoadingPng] = useState(false);
  const [error, setError] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [isRendering, setIsRendering] = useState(false);

  // Function to clean and validate Mermaid code
  const cleanMermaidCode = (code) => {
    if (!code) return '';
    
    let cleaned = code;
    
    // Step 1: Handle <br> tags properly - replace with spaces instead of newlines
    cleaned = cleaned.replace(/<br\s*\/?>/gi, ' ');
    
    // Step 2: Handle specific problematic patterns in node labels
    // Pattern: A[ASP Pages <br> (e.g., Rlv_ISLLPOL_2] -> A[ASP Pages]
    cleaned = cleaned.replace(/([A-Z])\[([^\]]*?)(?:<br>|\([^)]*\))[^\]]*?\]/g, (match, nodeId, content) => {
      const cleanedContent = content.trim();
      return `${nodeId}[${cleanedContent}]`;
    });
    
    // Step 3: Handle patterns like Q[/policies (GET)] -> Q[policies]
    cleaned = cleaned.replace(/([A-Z])\[([^\]]*?)\/\([^)]*\)([^\]]*?)\]/g, (match, nodeId, before, after) => {
      const cleanedContent = (before + after).trim();
      return `${nodeId}[${cleanedContent}]`;
    });
    
    // Step 4: Fix subgraph syntax - completely rewrite subgraph handling
    // First, try to detect if this is a subgraph-based diagram
    if (cleaned.includes('subgraph')) {
      console.log('Original code with subgraph:', cleaned);
      
      // Method 1: Try to fix subgraph syntax with proper spacing
      let fixedSubgraph = cleaned
        .replace(/subgraph\s+([^\n]+)/g, 'subgraph $1')
        .replace(/subgraph\s*([A-Za-z0-9_\s]+)\s*\n/g, 'subgraph $1\n')
        .replace(/end\s*\n/g, 'end\n')
        .replace(/subgraph\s*([^\n]+)\s*{/g, 'subgraph $1\n')
        .replace(/}\s*end/g, '\nend');
      
      // Method 2: If subgraph still fails, convert to simple flowchart
      if (fixedSubgraph.includes('subgraph')) {
        console.log('Attempting to convert subgraph to simple flowchart...');
        
        // Extract all nodes from the original code
        const nodeMatches = cleaned.match(/([A-Z])\[([^\]]+)\]/g) || [];
        const nodes = nodeMatches.map(match => {
          const [, id, label] = match.match(/([A-Z])\[([^\]]+)\]/);
          return { id, label: label.replace(/[<>]/g, '').trim() };
        });
        
        if (nodes.length > 0) {
          // Create a simple flowchart without subgraphs
          let simpleFlowchart = 'flowchart TD\n';
          
          // Add all nodes
          nodes.forEach(node => {
            simpleFlowchart += `  ${node.id}[${node.label}]\n`;
          });
          
          // Add connections (simple sequential)
          for (let i = 0; i < nodes.length - 1; i++) {
            simpleFlowchart += `  ${nodes[i].id} --> ${nodes[i + 1].id}\n`;
          }
          
          console.log('Converted to simple flowchart:', simpleFlowchart);
          return simpleFlowchart;
        }
      }
      
      // Method 3: If all else fails, create a basic diagram
      console.log('Creating fallback diagram due to subgraph issues');
      return `flowchart TD
    A[System Components] --> B[User Interface]
    B --> C[Business Logic]
    C --> D[Data Access]
    D --> E[Database]
    C --> F[External APIs]`;
    }
    
    // Step 5: Fix flowchart syntax issues
    // Ensure proper spacing after flowchart declaration
    cleaned = cleaned.replace(/flowchart\s*([A-Z]+)/g, 'flowchart $1');
    
    // Step 6: Fix node definitions with special characters
    // Handle nodes with parentheses in labels
    cleaned = cleaned.replace(/([A-Z])\[([^\]]*?\([^)]*\)[^\]]*?)\]/g, (match, nodeId, content) => {
      // Remove parentheses from content
      const cleanedContent = content.replace(/\([^)]*\)/g, '').trim();
      return `${nodeId}[${cleanedContent}]`;
    });
    
    // Step 7: Fix edge definitions
    // Handle edges with special characters
    cleaned = cleaned.replace(/([A-Z])\s*-->\s*([A-Z])/g, '$1 --> $2');
    cleaned = cleaned.replace(/([A-Z])\s*---\s*([A-Z])/g, '$1 --- $2');
    
    // Step 8: Remove any remaining problematic characters but preserve structure
    cleaned = cleaned.replace(/[<>]/g, ''); // Remove angle brackets
    cleaned = cleaned.replace(/\s+/g, ' '); // Normalize whitespace
    cleaned = cleaned.trim();
    
    // Step 9: Ensure proper line endings
    cleaned = cleaned.replace(/\n\s*\n/g, '\n'); // Remove empty lines
    cleaned = cleaned.replace(/\n+/g, '\n'); // Normalize line endings
    
    console.log('Cleaned Mermaid code:', cleaned);
    return cleaned;
  };

  // Create a completely safe fallback diagram
  const createSafeDiagram = (originalCode) => {
    // Try to extract meaningful information from the original code
    const nodeMatches = originalCode.match(/([A-Z])\[([^\]]+)\]/g) || [];
    const nodes = nodeMatches.map(match => {
      const [, id, label] = match.match(/([A-Z])\[([^\]]+)\]/);
      return { id, label: label.replace(/[<>]/g, '').trim() };
    });
    
    if (nodes.length > 0) {
      // Create a simplified diagram with the extracted nodes
      let fallbackCode = 'graph TD\n';
      nodes.forEach((node, index) => {
        if (index > 0) {
          fallbackCode += `${nodes[index - 1].id} --> ${node.id}\n`;
        }
      });
      return fallbackCode;
    }
    
    // Default fallback if no nodes can be extracted
    return `graph TD
    A[Diagram Generated] --> B[Original contained complex syntax]
    B --> C[Showing simplified version]
    C --> D[Check code below for details]`;
  };

  useEffect(() => {
    let isMounted = true;
    let renderTimeout;
    
    async function renderMermaid() {
      if (!code) {
        setError('No diagram code provided.');
        return;
      }
      
      try {
        setError(null);
        setFallbackMode(false);
        setIsRendering(true);
        
        // Dynamically import mermaid if not already loaded
        if (!window.mermaid) {
          const mermaidModule = await import('mermaid');
          window.mermaid = mermaidModule.default || mermaidModule;
        }
        
        // Initialize mermaid with more permissive configuration
        window.mermaid.initialize({ 
          startOnLoad: false,
          theme: 'default',
          flowchart: { 
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          securityLevel: 'loose'
        });
        
        if (isMounted) {
          const cleanedCode = cleanMermaidCode(code);
          
          if (cleanedCode && cleanedCode !== code) {
            console.log('Code cleaned for rendering');
            console.log('Original code:', code);
            console.log('Cleaned code:', cleanedCode);
          }
          
          try {
            // Use a unique ID for each render to avoid conflicts
            const uniqueId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Render the diagram using mermaid's render function
            const { svg } = await window.mermaid.render(uniqueId, cleanedCode);
            
            if (isMounted) {
              setSvgContent(svg);
              setError(null);
            }
          } catch (renderError) {
            console.warn('Primary render failed, trying fallback:', renderError);
            
            if (isMounted) {
              // Try with different Mermaid configurations
              try {
                // Try with more permissive settings
                window.mermaid.initialize({ 
                  startOnLoad: false,
                  theme: 'default',
                  flowchart: { 
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis'
                  },
                  securityLevel: 'loose',
                  logLevel: 0 // Disable logging for fallback
                });
                
                const fallbackCode = createSafeDiagram(code);
                const uniqueId = `${id}-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await window.mermaid.render(uniqueId, fallbackCode);
                setSvgContent(svg);
                setFallbackMode(true);
                setError('Diagram rendered with simplified syntax due to parsing issues.');
              } catch (fallbackError) {
                console.warn('Fallback render also failed:', fallbackError);
                
                // Create a simple text-based representation
                const textRepresentation = `
                  <div style="padding: 20px; text-align: center; color: #666; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Diagram could not be rendered</h4>
                    <p style="margin: 0 0 15px 0;">The original diagram contained syntax that could not be parsed.</p>
                    <details style="margin-top: 10px; text-align: left;">
                      <summary style="cursor: pointer; color: #0066cc;">View Original Code</summary>
                      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px; overflow-x: auto;">${code}</pre>
                    </details>
                  </div>
                `;
                
                setSvgContent(textRepresentation);
                setError('Diagram could not be rendered. Check the original code for syntax issues.');
                setFallbackMode(true);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in renderMermaid:', error);
        if (isMounted) {
          setError(`Failed to render diagram: ${error.message}`);
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    }
    
    // Add a small delay to prevent rapid re-renders
    renderTimeout = setTimeout(() => {
    renderMermaid();
    }, 100);
    
    return () => { 
      isMounted = false; 
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
    };
  }, [code, id]);

  const downloadPng = async () => {
    try {
      setLoadingPng(true);
      const response = await fetch(`${API_BASE_URL}/api/render_mermaid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${id}.png`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate PNG');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download diagram');
    } finally {
      setLoadingPng(false);
    }
  };

  // Fetch PNG for inline display
  const fetchPng = useCallback(async () => {
    setLoadingPng(true);
    setPngUrl(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/render_mermaid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPngUrl(url);
      } else {
        setPngUrl(null);
      }
    } catch (error) {
      console.error('PNG fetch error:', error);
      setPngUrl(null);
    }
    setLoadingPng(false);
  }, [API_BASE_URL, code]);

  useEffect(() => {
    if (showPngInline && code) {
      fetchPng();
    }
    return () => {
      if (pngUrl) window.URL.revokeObjectURL(pngUrl);
    };
  }, [showPngInline, code, fetchPng, pngUrl]);

  if (error && fallbackMode) {
    return (
      <div className="glass-card rounded-lg shadow-lg border p-6">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {title}
            </h3>
          </div>
        )}
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-700 mb-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Diagram Rendering Issue</span>
          </div>
          <p className="text-yellow-700 mb-3">{error}</p>
          <div className="bg-white rounded border p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Diagram Code:</h4>
            <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
              {code}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Show fallback indicator when in fallback mode but no error
  if (fallbackMode && !error) {
    return (
      <div className="glass-card rounded-lg shadow-lg border p-6">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {title}
            </h3>
            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Simplified Version
            </div>
          </div>
        )}
        
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <div ref={containerRef} className="p-4 min-h-[200px] flex items-center justify-center">
            {!code && (
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No diagram code available</p>
              </div>
            )}
            {code && !containerRef.current?.innerHTML && !error && (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Rendering diagram...</p>
              </div>
            )}
            {code && error && !fallbackMode && (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Attempting to fix diagram syntax...</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Simplified Diagram</span>
          </div>
          <p className="text-blue-600 text-xs">The original diagram contained complex syntax. This is a simplified version.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg shadow-lg border p-6">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {title}
          </h3>
          {showDownloadPng && (
            <button
              onClick={downloadPng}
              disabled={loadingPng}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingPng ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download PNG
            </button>
          )}
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden bg-gray-50">
        <div ref={containerRef} className="p-4 min-h-[200px] flex items-center justify-center">
          {!code && (
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No diagram code available</p>
            </div>
          )}
          {code && isRendering && (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Rendering diagram...</p>
            </div>
          )}
          {code && error && !fallbackMode && (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Attempting to fix diagram syntax...</p>
            </div>
          )}
          {svgContent && (
            <div 
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      </div>
      
      {showPngInline && pngUrl && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">PNG Preview:</h4>
          <img src={pngUrl} alt="Diagram PNG" className="max-w-full border rounded" />
        </div>
      )}
    </div>
  );
}

// Enhanced Backlog Stats with better visualization
function BacklogStats({ backlog }) {
  const [expanded, setExpanded] = useState({});

  const countItems = (items) => {
    let epics = 0, features = 0, stories = 0;
    items.forEach(item => {
      if (item.type === 'Epic') epics++;
      else if (item.type === 'Feature') features++;
      else if (item.type === 'User Story') stories++;
      if (item.children) {
        const childCounts = countItems(item.children);
        epics += childCounts.epics;
        features += childCounts.features;
        stories += childCounts.stories;
      }
    });
    return { epics, features, stories };
  };

  const counts = countItems(backlog);

  return (
    <div className="bg-white rounded-lg shadow-lg border p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        Project Statistics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800">Epics</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{counts.epics}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Features</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{counts.features}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-800">User Stories</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{counts.stories}</div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Progress Tracking Component
function ProgressTracker({ currentStep, totalSteps, stepNames }) {
  return (
    <div className="bg-white rounded-lg shadow-lg border p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Analysis Progress
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{currentStep}/{totalSteps}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {stepNames.map((step, index) => (
            <div 
              key={index}
              className={`p-2 rounded text-xs font-medium ${
                index < currentStep 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : index === currentStep 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Enhanced Real-time Collaboration Component
function CollaborationPanel({ notifications, messages }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <Bell className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">Collaboration</h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {notifications?.length > 0 ? (
              notifications.map((notification, index) => (
                <div key={index} className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">{notification}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BacklogCards({ backlog }) {
  const [expanded, setExpanded] = useState({});
  
  // Debug: Log the backlog prop
  console.log('BacklogCards received:', backlog);
  console.log('BacklogCards type:', typeof backlog);
  console.log('BacklogCards isArray:', Array.isArray(backlog));
  
  if (Array.isArray(backlog) && backlog.length > 0) {
    console.log('BacklogCards: First item details:', {
      id: backlog[0].id,
      type: backlog[0].type,
      title: backlog[0].title,
      description: backlog[0].description,
      hasChildren: backlog[0].children && backlog[0].children.length > 0,
      childrenCount: backlog[0].children ? backlog[0].children.length : 0,
      hasLinkingInfo: !!(backlog[0].trd_sections || backlog[0].requirements_covered)
    });
  }
  
  if (!Array.isArray(backlog) || backlog.length === 0) {
    console.log('BacklogCards: No valid backlog data, showing empty message');
    return <div className="p-4 text-gray-500 text-center">No backlog items were generated.</div>;
  }

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderLinkingInfo = (item) => {
    const hasLinkingInfo = item.trd_sections || item.requirements_covered;
    
    if (!hasLinkingInfo) return null;

    return (
      <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
        <div className="text-xs font-medium text-blue-700 mb-1">Links to:</div>
        {item.trd_sections && item.trd_sections.length > 0 && (
          <div className="mb-1">
            <span className="text-xs text-blue-600 font-medium">TRD Sections: </span>
            <span className="text-xs text-blue-800">{item.trd_sections.join(', ')}</span>
          </div>
        )}
        {item.requirements_covered && item.requirements_covered.length > 0 && (
          <div>
            <span className="text-xs text-blue-600 font-medium">Requirements: </span>
            <span className="text-xs text-blue-800">{item.requirements_covered.join(', ')}</span>
          </div>
        )}
      </div>
    );
  };

  const renderTree = (items, level = 0) => (
    <ul className={level > 0 ? "ml-4 pl-4 border-l-2 border-blue-200" : ""}>
      {items.map(item => (
        <li key={item.id} className="mb-3">
          <div className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              {item.children && item.children.length > 0 ? (
                <button onClick={() => toggle(item.id)} className="focus:outline-none">
                  {expanded[item.id] ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>
              ) : <span className="w-4 h-4" />}
              <span className={`font-semibold w-20 text-center text-xs py-1 rounded-full ${
                  item.type === 'Epic' ? 'bg-purple-100 text-purple-700' :
                  item.type === 'Feature' ? 'bg-sky-100 text-sky-700' :
                  'bg-emerald-100 text-emerald-700'
              }`}>{item.type}</span>
              <span className="text-gray-800 flex-1 font-medium">{item.title}</span>
              {item.priority && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.priority === 'High' ? 'bg-red-100 text-red-700' :
                  item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>{item.priority}</span>
              )}
              {item.effort && (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {item.effort} SP
                </span>
              )}
            </div>
            
            {item.description && (
              <div className="text-sm text-gray-600 mb-2 ml-6">{item.description}</div>
            )}
            
            {renderLinkingInfo(item)}
            
            {item.acceptance_criteria && item.acceptance_criteria.length > 0 && (
              <div className="mt-2 ml-6">
                <div className="text-xs font-medium text-gray-700 mb-1">Acceptance Criteria:</div>
                <ul className="text-xs text-gray-600 space-y-1">
                  {item.acceptance_criteria.map((criterion, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {item.children && item.children.length > 0 && expanded[item.id] && renderTree(item.children, level + 1)}
        </li>
      ))}
    </ul>
  );
  return <div className="bg-blue-50 rounded-lg p-4 shadow-inner">{renderTree(backlog)}</div>;
}

const Sidebar = ({ activeSection, setActiveSection, documents, pastAnalyses, selectedDocument, setSelectedDocument, selectedAnalysis, setSelectedAnalysis, sidebarOpen, setSidebarOpen }) => (
  <aside className={`sidebar fixed lg:relative left-4 lg:left-8 top-20 lg:top-8 h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] w-56 z-40 transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:flex-shrink-0 rounded-2xl lg:rounded-3xl overflow-hidden`}>
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">BA Agent</h1>
        </div>
      </div>
      
      <div className="flex-1 p-3 space-y-2">
        <button
          onClick={() => setActiveSection('new-analysis')}
          className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
            activeSection === 'new-analysis' 
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
              : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium text-sm">New Analysis</span>
        </button>
        
        <button
          onClick={() => setActiveSection('documents')}
          className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
            activeSection === 'documents' 
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
              : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span className="font-medium text-sm">Documents ({documents.length})</span>
        </button>
        
        <button
          onClick={() => setActiveSection('analyses')}
          className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
            activeSection === 'analyses' 
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
              : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="font-medium text-sm">Past Analyses ({pastAnalyses.length})</span>
        </button>
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => setActiveSection('capabilities')}
          className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
            activeSection === 'capabilities' 
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
              : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium text-sm">Admin Portal</span>
        </button>
      </div>
    </div>
  </aside>
);

const Capabilities = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
        <UploadCloud className="w-8 h-8 text-blue-500 mb-2" />
        <div className="font-bold text-gray-800 mb-1">Easy Input</div>
        <div className="text-gray-500 text-sm text-center">Upload BRD documents or paste text directly.</div>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
        <Search className="w-8 h-8 text-blue-500 mb-2" />
        <div className="font-bold text-gray-800 mb-1">Intelligent Extraction</div>
        <div className="text-gray-500 text-sm text-center">Extracts key text from your documents.</div>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
        <ListCollapse className="w-8 h-8 text-blue-500 mb-2" />
        <div className="font-bold text-gray-800 mb-1">Automated TRD</div>
        <div className="text-gray-500 text-sm text-center">Generates Technical Requirements Document.</div>
      </div>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
        <SendIcon className="w-8 h-8 text-blue-500 mb-2" />
        <div className="font-bold text-gray-800 mb-1">Seamless Integration</div>
        <div className="text-gray-500 text-sm text-center">Streamlines TRD approval and DevOps sync.</div>
      </div>
    </div>
  );

const DocumentsSection = ({ documents, selectedDocument, setSelectedDocument, setDocuments, setNotification }) => {
  const [uploading, setUploading] = useState(false);

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/api/upload_document`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const newDoc = await response.json();
        setDocuments(prev => [...prev, newDoc]);
        setNotification({ message: 'Document uploaded successfully!', type: 'success' });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setNotification({ message: 'Failed to upload document', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Documents Library</h2>
        <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-all">
          {uploading ? 'Uploading...' : 'Upload Document'}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleDocumentUpload}
            disabled={uploading}
          />
        </label>
      </div>
      
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No documents yet</h3>
          <p className="text-gray-500">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDocument(doc)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedDocument?.id === doc.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 truncate">{doc.name}</h4>
                  <p className="text-sm text-gray-500">{doc.uploadDate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PastAnalysesSection = ({ pastAnalyses, selectedAnalysis, setSelectedAnalysis }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Past Analyses</h2>
      
      {pastAnalyses.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No past analyses</h3>
          <p className="text-gray-500">Your completed analyses will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analysis List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Analysis History</h3>
            {pastAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                onClick={() => setSelectedAnalysis(analysis)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedAnalysis?.id === analysis.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">{analysis.title}</h4>
                    <p className="text-sm text-gray-500">{analysis.date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      analysis.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {analysis.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Analysis Details */}
          {selectedAnalysis && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Analysis Details</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">{selectedAnalysis.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">Created: {selectedAnalysis.date}</p>
                  <p className="text-sm text-gray-600 mb-4">Status: {selectedAnalysis.status}</p>
                </div>
                
                {selectedAnalysis.results && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-700">Generated Content:</h5>
                    <div className="space-y-2">
                      {selectedAnalysis.results.trd && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>Technical Requirements Document</span>
                        </div>
                      )}
                      {selectedAnalysis.results.hld && (
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart3 className="w-4 h-4 text-green-500" />
                          <span>High Level Design</span>
                        </div>
                      )}
                      {selectedAnalysis.results.lld && (
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart3 className="w-4 h-4 text-green-500" />
                          <span>Low Level Design</span>
                        </div>
                      )}
                      {selectedAnalysis.results.backlog && (
                        <div className="flex items-center gap-2 text-sm">
                          <ListCollapse className="w-4 h-4 text-purple-500" />
                          <span>Project Backlog</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <button
                    onClick={() => {
                      // Here you could implement a function to load the full analysis results
                      console.log('Loading full analysis:', selectedAnalysis.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4" />
                    View Full Analysis
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function MainApp() {
  // Global error handler for DOM manipulation issues
  useEffect(() => {
    const handleGlobalError = (event) => {
      if (event.error && event.error.message && event.error.message.includes('removeChild')) {
        console.warn('DOM manipulation error caught:', event.error.message);
        // Prevent the error from breaking the app
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('removeChild')) {
        console.warn('Unhandled DOM manipulation error:', event.reason.message);
        event.preventDefault();
      }
    });

    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  const [activeSection, setActiveSection] = useState('upload');
  const [documents, setDocuments] = useState([]);
  const [pastAnalyses, setPastAnalyses] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [imageModal, setImageModal] = useState({ open: false, src: '', alt: '' });
  const [currentStep, setCurrentStep] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [approvalReady, setApprovalReady] = useState(false);

  // Enhanced progress tracking
  const stepNames = [
    'Document Upload',
    'Content Extraction', 
    'Planning Analysis',
    'Technical Documentation',
    'Diagram Generation',
    'Backlog Creation',
    'Final Assembly'
  ];

  // Safe event listener cleanup
  const cleanupEventListeners = (listeners) => {
    listeners.forEach(({ event, handler }) => {
      try {
        document.removeEventListener(event, handler);
      } catch (e) {
        console.warn('Event listener cleanup warning:', e.message);
      }
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => { 
      if (e.key === 'Escape') {
        setImageModal({ open: false, src: '', alt: '' }); 
      }
    };
    
    try {
    document.addEventListener('keydown', onKeyDown);
    } catch (e) {
      console.warn('Event listener setup warning:', e.message);
    }
    
    return () => {
      try {
        document.removeEventListener('keydown', onKeyDown);
      } catch (e) {
        console.warn('Event listener cleanup warning:', e.message);
      }
    };
  }, []);

  useEffect(() => {
    const handleTab = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const sections = ['upload', 'documents', 'analyses'];
        const currentIndex = sections.indexOf(activeSection);
        const nextIndex = (currentIndex + 1) % sections.length;
        setActiveSection(sections[nextIndex]);
      }
    };
    
    try {
    document.addEventListener('keydown', handleTab);
    } catch (e) {
      console.warn('Event listener setup warning:', e.message);
    }
    
    return () => {
      try {
        document.removeEventListener('keydown', handleTab);
      } catch (e) {
        console.warn('Event listener cleanup warning:', e.message);
      }
    };
  }, [activeSection]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        const [docsResponse, analysesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/documents`),
          fetch(`${API_BASE_URL}/api/analyses`)
        ]);
        
        if (isMounted) {
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocuments(docsData);
        }
        
        if (analysesResponse.ok) {
          const analysesData = await analysesResponse.json();
          setPastAnalyses(analysesData);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    setIsProcessing(true);
    setCurrentStep(1);
    setResults(null);
    setApprovalReady(false);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      setNotification({ show: true, message: 'Uploading document...', type: 'info' });
      setCurrentStep(2);
      
      // Simulate incremental progress updates
      const progressInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < stepNames.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000); // Update every 2 seconds
      
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        clearInterval(progressInterval);
        setCurrentStep(stepNames.length); // Set to 100%
        
        // Debug: Log the received data
        console.log('Received data from backend:', data);
        console.log('Backlog data:', data.backlog);
        console.log('Backlog type:', typeof data.backlog);
        console.log('Backlog length:', Array.isArray(data.backlog) ? data.backlog.length : 'Not an array');
        
        setResults(data);
        setApprovalReady(true);
        setNotification({ show: true, message: 'Analysis completed successfully! Approval button is now enabled.', type: 'success' });
        
        // Add to notifications for collaboration
        setNotifications(prev => [...prev, `New analysis completed for ${file.name}`]);
        
        // Reload data
        const [docsResponse, analysesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/documents`),
          fetch(`${API_BASE_URL}/api/analyses`)
        ]);
        
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocuments(docsData);
        }
        
        if (analysesResponse.ok) {
          const analysesData = await analysesResponse.json();
          setPastAnalyses(analysesData);
        }
      } else {
        clearInterval(progressInterval);
        const errorData = await response.json();
        setNotification({ show: true, message: `Error: ${errorData.error}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error:', error);
      setNotification({ show: true, message: 'Network error occurred', type: 'error' });
    } finally {
      setIsProcessing(false);
      setCurrentStep(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file-upload');
    if (fileInput.files[0]) {
      await handleFileUpload(fileInput.files[0]);
    }
  };

  const handleDownloadAll = () => {
    if (!results) return;
    
    const zip = new JSZip();
    
    // Add TRD
    if (results.trd) {
      zip.file('Technical_Requirements_Document.md', results.trd);
    }
    
    // Add diagrams
    if (results.hld) {
      zip.file('High_Level_Design.md', results.hld);
    }
    if (results.lld) {
      zip.file('Low_Level_Design.md', results.lld);
    }
    
    // Add backlog
    if (results.backlog) {
      zip.file('Project_Backlog.json', JSON.stringify(results.backlog, null, 2));
    }
    
    // Add new specialized analysis results
    if (results.sentiment_analysis) {
      zip.file('Sentiment_Analysis.md', results.sentiment_analysis);
    }
    if (results.risk_assessment) {
      zip.file('Risk_Assessment.md', results.risk_assessment);
    }
    if (results.cost_estimation) {
      zip.file('Cost_Estimation.md', results.cost_estimation);
    }
    
    zip.generateAsync({ type: 'blob' }).then(content => {
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BA_Agent_Analysis.zip';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const handleSendForApproval = async () => {
    if (!results) return;
    
    try {
      setNotification({ show: true, message: 'Sending for approval...', type: 'info' });
      
      const response = await fetch(`${API_BASE_URL}/api/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: results.analysis_id,
          results: results
        }),
      });
      
      if (response.ok) {
        const approvalData = await response.json();
        setNotification({ 
          show: true, 
          message: `Analysis sent for approval! Approval ID: ${approvalData.approval_id}`, 
          type: 'success' 
        });
        
        // Store the approval ID for later checking
        setResults(prev => ({
          ...prev,
          approval_id: approvalData.approval_id,
          approval_url: approvalData.approval_url
        }));
      } else {
        const errorData = await response.json();
        setNotification({ show: true, message: `Failed to send for approval: ${errorData.error}`, type: 'error' });
      }
    } catch (error) {
      setNotification({ show: true, message: 'Error sending for approval', type: 'error' });
    }
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotification({ show: true, message: `${label} copied to clipboard!`, type: 'success' });
    } catch (error) {
      setNotification({ show: true, message: 'Failed to copy to clipboard', type: 'error' });
    }
  };

  const downloadAsDocx = async (markdownContent, filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/convert_to_docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: markdownContent }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        setNotification({ show: true, message: 'Failed to convert to DOCX', type: 'error' });
      }
    } catch (error) {
      setNotification({ show: true, message: 'Error converting to DOCX', type: 'error' });
    }
  };

  const ProgressStepper = () => {
    const [showDetails, setShowDetails] = useState(false);
    
    const getStepIcon = (stepIndex) => {
      const icons = [
        <UploadCloud key="upload" className="w-5 h-5" />,
        <Search key="extract" className="w-5 h-5" />,
        <Target key="planning" className="w-5 h-5" />,
        <FileText key="tech" className="w-5 h-5" />,
        <BarChart3 key="diagram" className="w-5 h-5" />,
        <ListCollapse key="backlog" className="w-5 h-5" />,
        <CheckCircle key="final" className="w-5 h-5" />
      ];
      return icons[stepIndex] || <Activity key="default" className="w-5 h-5" />;
    };

    const getStepDescription = (stepIndex) => {
      const descriptions = [
        "Uploading and validating your document...",
        "Extracting text content and key information...",
        "Analyzing requirements and creating project plan...",
        "Generating technical requirements documentation...",
        "Creating system architecture diagrams...",
        "Building comprehensive project backlog...",
        "Finalizing and assembling all deliverables..."
      ];
      return descriptions[stepIndex] || "Processing...";
    };

    return (
      <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Analysis in Progress</h3>
              <p className="text-sm text-gray-600">Step {currentStep} of {stepNames.length}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${(currentStep / stepNames.length) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>{Math.round((currentStep / stepNames.length) * 100)}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Current Step Details */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep > 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'
            }`}>
              {getStepIcon(currentStep - 1)}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">
                {currentStep > 0 ? stepNames[currentStep - 1] : 'Initializing...'}
              </h4>
              <p className="text-sm text-gray-600">
                {currentStep > 0 ? getStepDescription(currentStep - 1) : 'Preparing analysis environment...'}
              </p>
            </div>
            {currentStep > 0 && (
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Detailed Steps */}
        {showDetails && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-gray-700 mb-3">All Steps:</h4>
            {stepNames.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                  index < currentStep
                    ? 'bg-green-50 border border-green-200 animate-step-complete'
                    : index === currentStep - 1
                    ? 'bg-blue-50 border border-blue-200 animate-pulse'
                    : 'bg-gray-50 border border-gray-200'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep - 1
                    ? 'bg-blue-600 text-white animate-pulse'
                    : 'bg-gray-300 text-gray-500'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    getStepIcon(index)
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    index < currentStep
                      ? 'text-green-800'
                      : index === currentStep - 1
                      ? 'text-blue-800'
                      : 'text-gray-600'
                  }`}>
                    {step}
                  </p>
                  <p className={`text-xs ${
                    index < currentStep
                      ? 'text-green-600'
                      : index === currentStep - 1
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`}>
                    {index < currentStep
                      ? 'Completed'
                      : index === currentStep - 1
                      ? getStepDescription(index)
                      : 'Pending'
                    }
                  </p>
                </div>
                {index < currentStep && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const ResultsTabs = () => {
    const [activeTab, setActiveTab] = useState('overview');
    
    const extractMermaid = (str) => (str || '').replace(/```mermaid\n|```/g, '');
    const download = (data, filename, type) => {
      const blob = new Blob([data], { type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    };
    const downloadJson = (obj, filename) => download(JSON.stringify(obj, null, 2), filename, 'application/json');

    // Helper function to check if a section is completed
    const isSectionCompleted = (sectionId) => {
      switch (sectionId) {
        case 'trd':
          return !!results?.trd;
        case 'diagrams':
          return !!(results?.hld || results?.lld);
        case 'backlog':
          return !!results?.backlog;
        case 'azure-devops':
          return !!results?.approval_status;
        default:
          return false;
      }
    };

    const tabs = [
      { id: 'trd', label: 'Technical Requirements', icon: FileText },
      { id: 'diagrams', label: 'Diagrams', icon: BarChart3 },
      { id: 'backlog', label: 'Project Backlog', icon: ListCollapse },
      { id: 'azure-devops', label: 'Azure DevOps', icon: Settings }
    ];

    return (
      <div className="bg-white rounded-lg shadow-lg border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isCompleted = isSectionCompleted(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {isCompleted && (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-1" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'trd' && results?.trd && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Technical Requirements Document</h3>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(results.trd, 'TRD')}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => downloadAsDocx(results.trd, 'Technical_Requirements_Document.docx')}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download DOCX
                  </button>
                </div>
              </div>
              <MarkdownRenderer markdown={results.trd} title="Technical Requirements Document" />
            </div>
          )}

          {activeTab === 'diagrams' && (
            <div className="space-y-6">
              {results?.hld && (
                <div className="glass-card rounded-lg shadow-lg border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">High Level Design</h3>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(results.hld, 'High Level Design')}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={() => downloadAsDocx(results.hld, 'High_Level_Design.docx')}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4" />
                        Download DOCX
                      </button>
                    </div>
                  </div>
                  
                  {/* Mermaid Diagram */}
                  <MermaidDiagram 
                    key={`hld-${results?.analysis_id || 'default'}`}
                    code={extractMermaid(results.hld)} 
                    id="hld" 
                    showDownloadPng={true} 
                    title="High Level Design"
                  />
                </div>
              )}
              
              {results?.lld && (
                <div className="glass-card rounded-lg shadow-lg border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">Low Level Design</h3>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(results.lld, 'Low Level Design')}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={() => downloadAsDocx(results.lld, 'Low_Level_Design.docx')}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4" />
                        Download DOCX
                      </button>
                    </div>
                  </div>
                  
                  {/* Mermaid Diagram */}
                  <MermaidDiagram 
                    key={`lld-${results?.analysis_id || 'default'}`}
                    code={extractMermaid(results.lld)} 
                    id="lld" 
                    showDownloadPng={true} 
                    title="Low Level Design"
                  />
                </div>
              )}
              
              {!results?.hld && !results?.lld && (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No diagrams generated</h3>
                  <p className="text-gray-500">Diagrams will appear here after analysis is complete</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'backlog' && results?.backlog && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Project Backlog</h3>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(JSON.stringify(results.backlog, null, 2), 'Project Backlog')}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => downloadJson(results.backlog, 'Project_Backlog.json')}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON
                  </button>
                </div>
              </div>
              

              
              {/* Backlog Statistics */}
              <BacklogStats backlog={results.backlog} />
              
              {/* Backlog Cards */}
              <div className="glass-card rounded-lg shadow-lg border p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Backlog Items</h4>
                <BacklogCards backlog={results.backlog} />
              </div>
            </div>
          )}

          {activeTab === 'azure-devops' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Azure DevOps Integration</h3>
                  {results?.approval_status && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_BASE_URL}/api/ado/status`);
                        const status = await response.json();
                        setNotification({ 
                          show: true, 
                          message: `Azure DevOps Status: ${status.message}`, 
                          type: status.connected ? 'success' : 'error' 
                        });
                      } catch (error) {
                        setNotification({ 
                          show: true, 
                          message: 'Failed to check Azure DevOps status', 
                          type: 'error' 
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Activity className="w-4 h-4" />
                    Check Status
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_BASE_URL}/api/ado/test`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        const result = await response.json();
                        setNotification({ 
                          show: true, 
                          message: result.message, 
                          type: result.success ? 'success' : 'error' 
                        });
                      } catch (error) {
                        setNotification({ 
                          show: true, 
                          message: 'Failed to test Azure DevOps', 
                          type: 'error' 
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Settings className="w-4 h-4" />
                    Test Connection
                  </button>
                </div>
              </div>
              
              {/* Azure DevOps Status */}
              <div className="bg-white rounded-lg shadow-lg border p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Configuration Status</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Azure DevOps Integration</span>
                    </div>
                    <span className="text-sm text-gray-600">Ready for approval workflow</span>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-800 mb-2">How it works:</h5>
                    <ol className="text-sm text-blue-700 space-y-1">
                      <li>1. Generate analysis with backlog items</li>
                      <li>2. Send for approval via email</li>
                      <li>3. When approved, work items are automatically created in Azure DevOps</li>
                      <li>4. Epics, Features, and User Stories are created with proper hierarchy</li>
                    </ol>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h5 className="font-semibold text-yellow-800 mb-2">Required Configuration:</h5>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• ADO_PERSONAL_ACCESS_TOKEN - Your Azure DevOps PAT</li>
                      <li>• ADO_ORGANIZATION_URL - Your Azure DevOps organization URL</li>
                      <li>• ADO_PROJECT_NAME - Your Azure DevOps project name</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Approval Status */}
              {results?.approval_status && (
                <div className="bg-white rounded-lg shadow-lg border p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Approval Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        results.approval_status.status === 'approved' 
                          ? 'bg-green-100 text-green-700' 
                          : results.approval_status.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {results.approval_status.status}
                      </span>
                    </div>
                    
                    {results.approval_status.ado_result && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h5 className="font-semibold text-gray-700 mb-2">Azure DevOps Creation Result:</h5>
                        <div className="text-sm text-gray-600">
                          <p><strong>Success:</strong> {results.approval_status.ado_result.success ? 'Yes' : 'No'}</p>
                          <p><strong>Message:</strong> {results.approval_status.ado_result.message}</p>
                          {results.approval_status.ado_result.items && (
                            <div className="mt-2">
                              <p><strong>Items Created:</strong> {results.approval_status.ado_result.items.length}</p>
                              <ul className="mt-1 space-y-1">
                                {results.approval_status.ado_result.items.slice(0, 5).map((item, index) => (
                                  <li key={index} className="text-xs">
                                    {item.type}: {item.title} (ID: {item.id})
                                  </li>
                                ))}
                                {results.approval_status.ado_result.items.length > 5 && (
                                  <li className="text-xs text-gray-500">... and {results.approval_status.ado_result.items.length - 5} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Check Approval Status Button */}
              {results?.analysis_id && (
                <div className="bg-white rounded-lg shadow-lg border p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Check Approval Status</h4>
                  <button
                    onClick={async () => {
                      try {
                        if (results.approval_id) {
                          const response = await fetch(`${API_BASE_URL}/api/approval_status/${results.approval_id}`);
                          if (response.ok) {
                            const approvalStatus = await response.json();
                            setResults(prev => ({
                              ...prev,
                              approval_status: approvalStatus
                            }));
                            setNotification({ 
                              show: true, 
                              message: `Approval status: ${approvalStatus.status}`, 
                              type: approvalStatus.status === 'approve' ? 'success' : 'info' 
                            });
                          } else {
                            setNotification({ 
                              show: true, 
                              message: 'Failed to get approval status', 
                              type: 'error' 
                            });
                          }
                        } else {
                          setNotification({ 
                            show: true, 
                            message: 'No approval ID available. Send for approval first.', 
                            type: 'info' 
                          });
                        }
                      } catch (error) {
                        setNotification({ 
                          show: true, 
                          message: 'Failed to check approval status', 
                          type: 'error' 
                        });
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Activity className="w-4 h-4" />
                    Check Approval Status
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    After sending for approval, you can check the status here to see if Azure DevOps work items were created.
                  </p>
                  {results.approval_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Approval ID: {results.approval_id}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    );
  };

  // Notification component
  const Notification = () => (
    notification.show && (
      <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${
        notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
        notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
        'bg-blue-50 border-blue-200 text-blue-800'
      }`}>
        <div className="flex items-center gap-2">
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
        <button
          onClick={() => setNotification({ show: false, message: '', type: 'info' })}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    )
  );

  return (
    <div className="min-h-screen">
      <Notification />
      
      {/* Enhanced Header */}
      <header className="header">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">BA Agent Pro</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-2 py-1 text-gray-600 hover:text-gray-900">
                <Bell className="w-4 h-4" />
                <span className="text-xs">Notifications</span>
              </button>
              <button className="flex items-center gap-2 px-2 py-1 text-gray-600 hover:text-gray-900">
                <User className="w-4 h-4" />
                <span className="text-xs">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative pt-6">
        {/* Mobile overlay for sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Enhanced Sidebar */}
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          documents={documents}
          pastAnalyses={pastAnalyses}
          selectedDocument={selectedDocument}
          setSelectedDocument={setSelectedDocument}
          selectedAnalysis={selectedAnalysis}
          setSelectedAnalysis={setSelectedAnalysis}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Content Area */}
        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-6' : 'lg:ml-6'}`}>
          <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
            {activeSection === 'upload' && (
              <div className="space-y-4">
                <div className="glass-card rounded-lg shadow-lg border p-4 animate-scale-in">
                  <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" />
                    Upload Requirements Document
                  </h2>
                  <p className="text-gray-600 mb-4 text-sm">
                    Upload your business requirements document (PDF or DOCX) to generate comprehensive analysis including technical requirements, diagrams, and project backlog.
                  </p>

                  {isProcessing && <ProgressStepper />}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                        dragActive
                          ? 'border-blue-400 bg-blue-50 scale-105 shadow-lg'
                          : 'border-gray-300 hover:border-gray-400 hover:scale-102'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                      <div className="mt-3">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Drop your file here, or{' '}
                            <span className="text-blue-600 hover:text-blue-500">browse</span>
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            PDF or DOCX up to 10MB
                          </span>
                        </label>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf,.docx"
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <SendIcon className="w-5 h-5" />
                            Analyze Document
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {results && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">Analysis Results</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <span>Completion:</span>
                          <span className="font-medium">
                            {[
                              results?.trd ? 1 : 0,
                              (results?.hld || results?.lld) ? 1 : 0,
                              results?.backlog ? 1 : 0,
                              results?.approval_status ? 1 : 0
                            ].reduce((a, b) => a + b, 0)}/4
                          </span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadAll}
                          className="btn-primary flex items-center gap-2 px-3 py-1 rounded-lg text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download All
                        </button>
                        <button
                          onClick={handleSendForApproval}
                          disabled={!approvalReady}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all text-sm ${
                            approvalReady 
                              ? 'btn-primary' 
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          }`}
                        >
                          <SendIcon className="w-4 h-4" />
                          {approvalReady ? 'Send for Approval' : 'Approval Pending'}
                        </button>
                      </div>
                    </div>
                    <ResultsTabs key={`results-${results?.analysis_id || 'default'}`} />
                  </div>
                )}
              </div>
            )}

            {activeSection === 'documents' && (
              <div className="space-y-4">
                <DocumentsSection 
                  documents={documents} 
                  selectedDocument={selectedDocument} 
                  setSelectedDocument={setSelectedDocument}
                  setDocuments={setDocuments}
                  setNotification={setNotification}
                />
              </div>
            )}

            {activeSection === 'analyses' && (
              <div className="space-y-4">
                <PastAnalysesSection 
                  pastAnalyses={pastAnalyses} 
                  selectedAnalysis={selectedAnalysis}
                  setSelectedAnalysis={setSelectedAnalysis}
                />
              </div>
            )}

            {activeSection === 'capabilities' && (
              <div className="space-y-4">
                <Capabilities />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Collaboration Panel */}
      <CollaborationPanel notifications={notifications} />

      {/* Enhanced Image Modal */}
      {imageModal.open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setImageModal({ open: false, src: '', alt: '' });
            }
          }}
        >
          <div className="max-w-4xl max-h-full overflow-auto bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{imageModal.alt}</h3>
              <button
                onClick={() => setImageModal({ open: false, src: '', alt: '' })}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <img 
              src={imageModal.src} 
              alt={imageModal.alt} 
              className="max-w-full" 
              onError={(e) => {
                console.warn('Image failed to load:', imageModal.src);
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap the App component with ErrorBoundary
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;

