
const fs = require("fs");
const path = require("path");

// AI Tool: Search return policy
const search_return_policy = async (category) => {
    try {
        const policyPath = path.join(
            __dirname,
            "../policies/return-policy.md"
        );

        const policy = fs.readFileSync(policyPath, "utf8");

        if (!category || typeof category !== "string") {
            return {
                success: true,
                category: "general",
                policy
            };
        }

        const normalizedCategory = category.trim().toLowerCase();

        // Find the relevant category section
        const sections = policy.split(/^## /m);

        const matchingSection = sections.find((section) => {
            const heading = section.split("\n")[0].trim().toLowerCase();
            return heading === normalizedCategory;
        });

        // General rules apply to every category
        const generalSection = sections.find((section) =>
            section.split("\n")[0].trim().toLowerCase() === "general"
        );

        if (!matchingSection) {
            return {
                success: true,
                category: normalizedCategory,
                policy: generalSection
                    ? "## General\n" + generalSection
                    : policy
            };
        }

        return {
            success: true,
            category: normalizedCategory,
            policy:
                "## " + matchingSection.trim() +
                (generalSection
                    ? "\n\n## General\n" + generalSection
                    : "")
        };

    } catch (error) {
        console.error("Policy tool error:", error.message);

        return {
            success: false,
            message: "Unable to retrieve return policy."
        };
    }
};

module.exports = {
    search_return_policy
};
