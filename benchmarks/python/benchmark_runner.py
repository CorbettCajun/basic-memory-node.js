"""
Python Benchmark Runner for Basic Memory

This script provides a framework for running performance benchmarks
on the Python implementation of Basic Memory, generating results that
can be compared with the Node.js implementation.
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path

# Add the Python Basic Memory to the path
sys.path.append(os.path.abspath("../../basic-memory/src"))

try:
    from basic_memory.api import entity, observation, search
except ImportError:
    print("Error: Cannot import basic_memory modules. Ensure the Python implementation is available.")
    print("Expected path: ../../basic-memory/src")
    sys.exit(1)

# Path setup
SCRIPT_DIR = Path(__file__).parent
OPERATIONS_DIR = SCRIPT_DIR
RESULTS_DIR = SCRIPT_DIR.parent / "results"

# Ensure the results directory exists
RESULTS_DIR.mkdir(exist_ok=True)


def run_benchmark(fn, args=None, iterations=100, options=None):
    """
    Run a single benchmark
    
    Args:
        fn: Function to benchmark
        args: Arguments to pass to the function
        iterations: Number of iterations to run
        options: Additional options
        
    Returns:
        dict: Benchmark results
    """
    if args is None:
        args = []
    if options is None:
        options = {}
        
    # Warm up
    if options.get("warmup", True):
        for _ in range(min(10, iterations // 10)):
            fn(*args)
    
    # Run timed iterations
    times = []
    
    for i in range(iterations):
        # Time the operation
        start_time = time.time()
        result = fn(*args)
        end_time = time.time()
        
        # Calculate duration in milliseconds
        duration = (end_time - start_time) * 1000
        times.append(duration)
        
        # Optional progress logging
        if options.get("progress", False) and i % max(1, iterations // 10) == 0:
            print(f"Iteration {i}/{iterations} - {duration:.2f}ms")
            
        # Optional callback
        if options.get("on_iteration"):
            options["on_iteration"](i, duration, result)
    
    # Calculate statistics
    sorted_times = sorted(times)
    total_time = sum(times)
    
    results = {
        "name": options.get("name", fn.__name__),
        "iterations": iterations,
        "total": total_time,
        "mean": total_time / iterations,
        "median": sorted_times[iterations // 2],
        "min": sorted_times[0],
        "max": sorted_times[-1],
        "p95": sorted_times[int(iterations * 0.95)],
        "timestamp": datetime.now().isoformat()
    }
    
    # Save results if filename provided
    if options.get("save_file"):
        result_path = RESULTS_DIR / options["save_file"]
        with open(result_path, "w") as f:
            json.dump(results, None, 2)
        print(f"Results saved to {result_path}")
        
    return results


def run_suite(suite, options=None):
    """
    Run a benchmark suite (collection of benchmarks)
    
    Args:
        suite: Benchmark suite definition
        options: Suite options
        
    Returns:
        dict: Suite results
    """
    if options is None:
        options = {}
        
    print(f"\n🚀 Running benchmark suite: {suite['name']}")
    print("---------------------------------------")
    
    suite_results = {
        "name": suite["name"],
        "description": suite.get("description", ""),
        "benchmarks": [],
        "timestamp": datetime.now().isoformat(),
        "implementation": "python"
    }
    
    for benchmark in suite["benchmarks"]:
        print(f"\n▶️ Running benchmark: {benchmark['name']}")
        
        try:
            # Run setup if defined
            setup_result = None
            if "setup" in benchmark:
                setup_result = benchmark["setup"]()
                
            # Default options
            bench_options = {
                "name": benchmark["name"],
                "warmup": options.get("warmup", True),
                "progress": options.get("verbose", False),
                "save_file": options.get("save_individual") and 
                          f"{suite['name']}_{benchmark['name'].replace(' ', '_').lower()}.json"
            }
            
            # Prepare args
            if setup_result is not None:
                args = [setup_result]
            else:
                args = []
                
            # Run the benchmark
            result = run_benchmark(
                benchmark["fn"],
                args=args,
                iterations=benchmark.get("iterations", 100),
                options=bench_options
            )
            
            # Run cleanup if defined
            if "cleanup" in benchmark and setup_result is not None:
                benchmark["cleanup"](setup_result)
                
            # Add to suite results
            suite_results["benchmarks"].append(result)
            
            # Display results
            print(f"✅ {benchmark['name']}:")
            print(f"   Mean: {result['mean']:.2f}ms")
            print(f"   Median: {result['median']:.2f}ms")
            print(f"   Min/Max: {result['min']:.2f}ms / {result['max']:.2f}ms")
            
        except Exception as e:
            print(f"❌ Error in benchmark {benchmark['name']}: {e}")
            import traceback
            traceback.print_exc()
            suite_results["benchmarks"].append({
                "name": benchmark["name"],
                "error": str(e),
                "stack": traceback.format_exc()
            })
    
    # Save suite results
    if options.get("save_file"):
        result_path = RESULTS_DIR / options["save_file"]
        with open(result_path, "w") as f:
            json.dump(suite_results, f, indent=2)
        print(f"\n📊 Suite results saved to {result_path}")
        
    return suite_results


def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description="Python Benchmark Runner for Basic Memory")
    parser.add_argument("suite", help="Name of the benchmark suite to run")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    parser.add_argument("--save", "-s", help="Save results to file")
    parser.add_argument("--iterations", "-i", type=int, help="Override iteration count")
    
    args = parser.parse_args()
    
    # Import the requested suite module
    try:
        suite_module_name = f"{args.suite}_suite"
        suite_module = __import__(suite_module_name)
        suite = suite_module.SUITE
    except ImportError:
        print(f"Error: Benchmark suite '{args.suite}' not found")
        print("Available suites:")
        for file in OPERATIONS_DIR.glob("*_suite.py"):
            print(f"  - {file.stem.replace('_suite', '')}")
        return 1
        
    # Setup options
    options = {
        "verbose": args.verbose,
        "save_file": args.save or f"{args.suite}_python.json",
        "save_individual": True
    }
    
    # Override iterations if specified
    if args.iterations:
        for benchmark in suite["benchmarks"]:
            benchmark["iterations"] = args.iterations
    
    # Run the suite
    run_suite(suite, options)
    return 0


if __name__ == "__main__":
    sys.exit(main())
