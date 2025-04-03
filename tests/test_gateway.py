"""Test script for the gateway system's mode detection and content cleaning functionality."""

import csv
import logging
from pathlib import Path
from typing import Dict, List
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Add parent directory to sys.path so we can import pseudo
import sys

parent_dir = str(Path(__file__).resolve().parent.parent.parent)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from pseudo.core.services.content_router import ContentRouter  # noqa: E402

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define test case categories and their numeric IDs for cleaner visualization
CATEGORIES = {"explicit_text": 1, "explicit_image": 2, "explicit_audio": 3, "vague": 4}

# Define explicitness levels and their numeric IDs
EXPLICITNESS = {"very": 1, "moderate": 2, "less": 3, "none": 4}

# Define modes and their numeric IDs
MODES = {"text": 1, "image": 2, "audio": 3}


def get_test_case_id(category: str, explicitness: str, index: int) -> str:
    """Generate a short test case ID for visualization purposes."""
    cat_prefix = category[0] + category[-1]  # First and last letter
    expl_prefix = explicitness[0] if explicitness != "none" else "n"
    return f"{cat_prefix}{expl_prefix}{index}"


def load_test_cases() -> List[Dict]:
    """Load test cases organized by category and explicitness."""
    test_cases = [
        # Explicit Text Cases (10)
        {
            "prompt": "write text about quantum physics",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "very",
            "test_id": "et-v1",
        },
        {
            "prompt": "generate a paragraph about climate change",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "very",
            "test_id": "et-v2",
        },
        {
            "prompt": "create a sentence about artificial intelligence",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "very",
            "test_id": "et-v3",
        },
        {
            "prompt": "write an essay about renewable energy",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "very",
            "test_id": "et-v4",
        },
        {
            "prompt": "compose a story about space exploration",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "moderate",
            "test_id": "et-m1",
        },
        {
            "prompt": "draft a report about global warming",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "moderate",
            "test_id": "et-m2",
        },
        {
            "prompt": "summarize the history of computers",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "moderate",
            "test_id": "et-m3",
        },
        {
            "prompt": "explain the concept of machine learning",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "less",
            "test_id": "et-l1",
        },
        {
            "prompt": "describe the process of photosynthesis",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "less",
            "test_id": "et-l2",
        },
        {
            "prompt": "tell me about the solar system",
            "expected_mode": "text",
            "category": "explicit_text",
            "explicitness": "less",
            "test_id": "et-l3",
        },
        # Explicit Image Cases (10)
        {
            "prompt": "generate an image of a red cat",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "very",
            "test_id": "ei-v1",
        },
        {
            "prompt": "create a picture of a sunset",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "very",
            "test_id": "ei-v2",
        },
        {
            "prompt": "draw a diagram of the water cycle",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "very",
            "test_id": "ei-v3",
        },
        {
            "prompt": "make a photograph of mountains",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "very",
            "test_id": "ei-v4",
        },
        {
            "prompt": "design a logo for a tech company",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "moderate",
            "test_id": "ei-m1",
        },
        {
            "prompt": "illustrate a scene from a fairy tale",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "moderate",
            "test_id": "ei-m2",
        },
        {
            "prompt": "render a 3D model of a car",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "moderate",
            "test_id": "ei-m3",
        },
        {
            "prompt": "sketch a portrait of a person",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "less",
            "test_id": "ei-l1",
        },
        {
            "prompt": "paint a landscape of a forest",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "less",
            "test_id": "ei-l2",
        },
        {
            "prompt": "visualize the concept of time",
            "expected_mode": "image",
            "category": "explicit_image",
            "explicitness": "less",
            "test_id": "ei-l3",
        },
        # Explicit Text-to-Speech Cases (10)
        {
            "prompt": "convert this text to speech: hello world",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "very",
            "test_id": "ea-v1",
        },
        {
            "prompt": "read this text aloud: the quick brown fox",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "very",
            "test_id": "ea-v2",
        },
        {
            "prompt": "speak this text: welcome to the future",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "very",
            "test_id": "ea-v3",
        },
        {
            "prompt": "narrate this text: once upon a time",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "very",
            "test_id": "ea-v4",
        },
        {
            "prompt": "recite this text: the story begins",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "moderate",
            "test_id": "ea-m1",
        },
        {
            "prompt": "voice this text: the adventure awaits",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "moderate",
            "test_id": "ea-m2",
        },
        {
            "prompt": "pronounce this text: the journey begins",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "moderate",
            "test_id": "ea-m3",
        },
        {
            "prompt": "utter this text: the mystery unfolds",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "less",
            "test_id": "ea-l1",
        },
        {
            "prompt": "verbalize this text: the legend continues",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "less",
            "test_id": "ea-l2",
        },
        {
            "prompt": "articulate this text: the tale unfolds",
            "expected_mode": "audio",
            "category": "explicit_audio",
            "explicitness": "less",
            "test_id": "ea-l3",
        },
        # Vague Cases (10)
        {
            "prompt": "generate media about flowers",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v1",
        },
        {
            "prompt": "create content about space exploration",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v2",
        },
        {
            "prompt": "show me something about nature",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v3",
        },
        {
            "prompt": "make something about technology",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v4",
        },
        {
            "prompt": "produce something about art",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v5",
        },
        {
            "prompt": "create something about history",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v6",
        },
        {
            "prompt": "generate something about science",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v7",
        },
        {
            "prompt": "make something about culture",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v8",
        },
        {
            "prompt": "produce something about sports",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v9",
        },
        {
            "prompt": "create something about food",
            "expected_mode": None,
            "category": "vague",
            "explicitness": "none",
            "test_id": "v10",
        },
    ]
    return test_cases


def run_test_case(router: ContentRouter, test_case: Dict, run_number: int) -> Dict:
    """Run a single test case and return results."""
    prompt = test_case["prompt"]
    expected_mode = test_case["expected_mode"]
    category = test_case["category"]
    explicitness = test_case["explicitness"]
    test_id = test_case["test_id"]

    # Get mode and cleaned content
    detected_mode, cleaned_content = router.select_mode_and_clean_content(prompt)

    return {
        "run_number": run_number,
        "prompt": prompt,
        "expected_mode": expected_mode,
        "detected_mode": detected_mode,
        "cleaned_content": cleaned_content,
        "category": category,
        "explicitness": explicitness,
        "test_id": test_id,
        "matches_expected": detected_mode == expected_mode if expected_mode else True,
    }


def save_results(results: List[Dict], output_file: str):
    """Save test results to CSV file."""
    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)


def analyze_results(results_file: str):
    """Analyze test results and create visualizations."""
    # Read results into pandas DataFrame
    df = pd.read_csv(results_file)

    # Create output directory for plots
    plots_dir = Path(results_file).parent / "plots"
    plots_dir.mkdir(exist_ok=True)

    # Create a mapping lookup for test prompts to test IDs for reference
    test_id_map = (
        df[["test_id", "prompt"]].drop_duplicates().set_index("test_id")["prompt"].to_dict()
    )

    # Save test ID reference to file for easy lookup
    with open(plots_dir / "test_id_reference.txt", "w") as f:
        f.write("Test ID Reference:\n\n")
        for test_id, prompt in test_id_map.items():
            f.write(f"{test_id}: {prompt}\n")

    # =====================================================================
    # 1. Table-style visualization for explicit calls by explicitness level
    # =====================================================================
    # Rationale: Clear view of how each expected mode maps to actual detected modes

    # Filter for explicit cases only
    explicit_df = df[df["category"].str.startswith("explicit")].copy()

    # Group by explicitness level
    for explicitness_level in ["very", "moderate", "less"]:
        # Filter for current explicitness level
        level_df = explicit_df[explicit_df["explicitness"] == explicitness_level].copy()

        # Create the confusion table structure
        confusion_data = []

        # Process test cases by expected mode
        for expected_mode in ["text", "image", "audio"]:
            mode_df = level_df[level_df["expected_mode"] == expected_mode]

            # Group test cases by test_id for the current expected mode
            for test_id in mode_df["test_id"].unique():
                test_df = mode_df[mode_df["test_id"] == test_id]

                # Count detections per mode
                text_count = sum(test_df["detected_mode"] == "text")
                image_count = sum(test_df["detected_mode"] == "image")
                audio_count = sum(test_df["detected_mode"] == "audio")

                # Build row for the table
                case_num = int(test_id.split("-")[1][1:])  # Extract number from test_id
                confusion_data.append(
                    {
                        "Expected": expected_mode.capitalize(),
                        "Case": case_num,
                        "Text": text_count,
                        "Image": image_count,
                        "Audio": audio_count,
                        "Total": len(test_df),
                    }
                )

        # Convert to DataFrame and sort
        confusion_df = pd.DataFrame(confusion_data)
        confusion_df = confusion_df.sort_values(by=["Expected", "Case"])

        # Create a heatmap table
        plt.figure(figsize=(12, 10))

        # Create the heatmap
        confusion_pivoted = confusion_df.pivot_table(
            index=["Expected", "Case"], values=["Text", "Image", "Audio"], aggfunc="sum"
        )

        sns.heatmap(confusion_pivoted, annot=True, fmt="d", cmap="Blues", linewidths=0.5)
        plt.title(
            f"Detection Results for {explicitness_level.capitalize()} Explicit Prompts",
            fontsize=16,
        )
        plt.tight_layout()
        plt.savefig(plots_dir / f"explicit_{explicitness_level}_detection.png")
        plt.close()

        # Also save as CSV for reference
        confusion_df.to_csv(plots_dir / f"explicit_{explicitness_level}_detection.csv", index=False)

    # =====================================================================
    # 2. Mode Distribution for Vague Inputs (Pie Chart)
    # =====================================================================
    # Rationale: Pie charts are ideal for showing proportional distribution when total adds to 100%
    # Best for: Understanding how vague inputs are interpreted across different modes

    vague_df = df[df["category"] == "vague"].copy()
    mode_counts = vague_df["detected_mode"].value_counts()

    plt.figure(figsize=(10, 8))

    # Use dynamic colors and explode values based on the number of detected modes
    colors = plt.cm.Set3(np.linspace(0, 1, len(mode_counts)))
    explode = [0.1] * len(mode_counts)  # Create an explode array of the right length

    plt.pie(
        mode_counts,
        labels=mode_counts.index,
        autopct="%1.1f%%",
        startangle=90,
        colors=colors,
        explode=explode,
        shadow=True,
    )
    plt.axis("equal")  # Equal aspect ratio ensures pie is circular
    plt.title("Mode Distribution for Vague Inputs", fontsize=16)
    plt.tight_layout()
    plt.savefig(plots_dir / "vague_mode_distribution_pie.png")
    plt.close()

    # =====================================================================
    # 3. Mode Consistency Across Runs (Heatmap Without Color Intensity)
    # =====================================================================
    # Rationale: Matrix visualization shows which test cases produce consistent results
    # Best for: Identifying patterns of consistency/inconsistency in mode detection

    # Group by test_id and detected_mode to count occurrences
    consistency_data = pd.crosstab(df["test_id"], df["detected_mode"])

    plt.figure(figsize=(15, 10))
    sns.heatmap(consistency_data, cmap="Greys", annot=True, fmt="d", linewidths=0.5)
    plt.title("Mode Detection Consistency Across Test Runs", fontsize=16)
    plt.xlabel("Detected Mode")
    plt.ylabel("Test ID")
    plt.tight_layout()
    plt.savefig(plots_dir / "mode_consistency_matrix.png")
    plt.close()

    # =====================================================================
    # 4. Accuracy by Explicitness Level (Bar Chart with Error Bars)
    # =====================================================================
    # Rationale: Bar charts with error bars show mean values with uncertainty
    # Best for: Comparing accuracy across different explicitness levels with statistical significance

    # Calculate accuracy and standard error for each explicitness level
    explicitness_accuracy = explicit_df.groupby(["explicitness", "run_number"])[
        "matches_expected"
    ].mean()
    accuracy_mean = explicitness_accuracy.groupby("explicitness").mean()
    accuracy_std = explicitness_accuracy.groupby("explicitness").std()

    plt.figure(figsize=(10, 6))
    bar_colors = ["#1f77b4", "#ff7f0e", "#2ca02c"]

    bars = plt.bar(
        accuracy_mean.index,
        accuracy_mean,
        yerr=accuracy_std,
        capsize=10,
        color=bar_colors,
        alpha=0.7,
    )

    plt.title("Accuracy by Explicitness Level with Variance", fontsize=16)
    plt.ylabel("Accuracy Rate")
    plt.ylim(0, 1.2)  # Limit y-axis from 0 to 1.2 to show error bars

    # Add accuracy values on top of bars
    for bar in bars:
        height = bar.get_height()
        plt.text(
            bar.get_x() + bar.get_width() / 2.0,
            height + 0.05,
            f"{height:.2f}",
            ha="center",
            va="bottom",
        )

    plt.tight_layout()
    plt.savefig(plots_dir / "accuracy_by_explicitness.png")
    plt.close()

    # =====================================================================
    # 5. Vague Input Consistency (Horizontal Stacked Bar Chart)
    # =====================================================================
    # Rationale: Stacked bars show composition of categories
    # Best for: Visualizing how each vague input is interpreted across runs

    # Prepare data for stacked bar chart
    vague_distribution = pd.crosstab(vague_df["test_id"], vague_df["detected_mode"])

    # Normalize to get percentage
    vague_percentage = vague_distribution.div(vague_distribution.sum(axis=1), axis=0) * 100

    plt.figure(figsize=(12, 8))
    colors = plt.cm.Set3(np.linspace(0, 1, len(vague_percentage.columns)))
    vague_percentage.plot(kind="barh", stacked=True, color=colors, width=0.8)

    plt.title("Mode Distribution per Vague Input (%)", fontsize=16)
    plt.xlabel("Percentage")
    plt.ylabel("Test ID")
    plt.legend(title="Detected Mode")
    plt.grid(axis="x", linestyle="--", alpha=0.7)
    plt.tight_layout()
    plt.savefig(plots_dir / "vague_input_distribution.png")
    plt.close()

    # =====================================================================
    # 6. Cleaned Content Length Analysis (Box Plot)
    # =====================================================================
    # Rationale: Box plots show distribution statistics
    # Best for: Comparing the distribution of cleaned content length across modes

    # Add content length as a new column
    df["content_length"] = df["cleaned_content"].str.len()

    plt.figure(figsize=(12, 6))
    sns.boxplot(x="detected_mode", y="content_length", data=df)
    plt.title("Cleaned Content Length by Detected Mode", fontsize=16)
    plt.xlabel("Detected Mode")
    plt.ylabel("Content Length (characters)")
    plt.tight_layout()
    plt.savefig(plots_dir / "content_length_by_mode.png")
    plt.close()

    # =====================================================================
    # Print detailed analysis
    # =====================================================================

    print("\n" + "=" * 50)
    print("Gateway System Test Results Summary")
    print("=" * 50)

    print(f"\nTotal test cases: {len(df['test_id'].unique())}")
    print(f"Total runs: {len(df)}")

    # Overall accuracy metrics
    explicit_accuracy = explicit_df["matches_expected"].mean()
    print(f"\nOverall accuracy (explicit cases only): {explicit_accuracy:.2%}")

    # Mode distribution
    mode_dist = df["detected_mode"].value_counts()
    print("\nOverall Mode Distribution:")
    for mode, count in mode_dist.items():
        print(f"  {mode}: {count} ({count/len(df):.1%})")

    # Accuracy by category
    category_accuracy = explicit_df.groupby("category")["matches_expected"].mean()
    print("\nAccuracy by Category:")
    for category, accuracy in category_accuracy.items():
        print(f"  {category}: {accuracy:.2%}")

    # Accuracy by explicitness
    print("\nAccuracy by Explicitness Level:")
    for explicitness, accuracy in accuracy_mean.items():
        print(f"  {explicitness}: {accuracy:.2%}")

    # Vague input analysis
    vague_mode_dist = vague_df["detected_mode"].value_counts()
    print("\nVague Cases Mode Distribution:")
    for mode, count in vague_mode_dist.items():
        print(f"  {mode}: {count} ({count/len(vague_df):.1%})")

    # Consistency analysis
    vague_consistency = vague_df.groupby("test_id")["detected_mode"].nunique()
    unique_modes_count = vague_consistency.value_counts()
    print("\nVague Test Case Consistency:")
    for unique_modes, count in unique_modes_count.items():
        print(f"  Cases with {unique_modes} different detected modes: {count}")

    print("\nTest cases with highest variability:")
    high_var_cases = vague_consistency[vague_consistency > 1].index.tolist()
    for test_id in high_var_cases:
        prompt = test_id_map[test_id]
        modes = vague_df[vague_df["test_id"] == test_id]["detected_mode"].value_counts()
        print(f"  {test_id} ({prompt}):")
        for mode, count in modes.items():
            print(f"    {mode}: {count} times")

    print("\nAnalysis complete. Visualizations saved to the 'plots' directory.")
    print("For test ID reference, see 'plots/test_id_reference.txt'")


def main():
    """Main test execution function."""
    # Initialize router
    router = ContentRouter()

    # Load test cases
    test_cases = load_test_cases()

    # Run tests
    results = []
    num_runs = 10  # Run each test case 10 times

    for test_case in test_cases:
        for run in range(num_runs):
            result = run_test_case(router, test_case, run + 1)
            results.append(result)

    # Save results in tests directory
    output_dir = Path(__file__).parent
    output_file = output_dir / "gateway_test_results.csv"
    save_results(results, str(output_file))

    # Analyze results
    analyze_results(str(output_file))

    print(f"\nResults saved to {output_file}")


if __name__ == "__main__":
    main()
