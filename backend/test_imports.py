#!/usr/bin/env python3

print("Testing Phase 2 Dependencies...")

# Test LangChain
try:
    import langchain
    print("✅ LangChain imported successfully")
    LANGCHAIN_OK = True
except ImportError as e:
    print(f"❌ LangChain import failed: {e}")
    LANGCHAIN_OK = False

# Test Plotly
try:
    import plotly
    print("✅ Plotly imported successfully")
    PLOTLY_OK = True
except ImportError as e:
    print(f"❌ Plotly import failed: {e}")
    PLOTLY_OK = False

# Test NetworkX
try:
    import networkx
    print("✅ NetworkX imported successfully")
    NETWORKX_OK = True
except ImportError as e:
    print(f"❌ NetworkX import failed: {e}")
    NETWORKX_OK = False

# Test our modules
try:
    import langchain_integration
    print("✅ LangChain integration module imported successfully")
    LANGCHAIN_INT_OK = True
except ImportError as e:
    print(f"❌ LangChain integration import failed: {e}")
    LANGCHAIN_INT_OK = False

try:
    import phase2_analytics
    print("✅ Phase 2 Analytics module imported successfully")
    PHASE2_OK = True
except ImportError as e:
    print(f"❌ Phase 2 Analytics import failed: {e}")
    PHASE2_OK = False

print("\n=== SUMMARY ===")
print(f"LangChain: {'✅' if LANGCHAIN_OK else '❌'}")
print(f"Plotly: {'✅' if PLOTLY_OK else '❌'}")
print(f"NetworkX: {'✅' if NETWORKX_OK else '❌'}")
print(f"LangChain Integration: {'✅' if LANGCHAIN_INT_OK else '❌'}")
print(f"Phase 2 Analytics: {'✅' if PHASE2_OK else '❌'}")

if all([LANGCHAIN_OK, PLOTLY_OK, NETWORKX_OK, LANGCHAIN_INT_OK, PHASE2_OK]):
    print("\n🎉 All Phase 2 dependencies are ready!")
else:
    print("\n⚠️ Some dependencies need attention")
