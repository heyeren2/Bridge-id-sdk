#!/usr/bin/env node
const { createHash } = require("crypto");
const readline = require("readline");

function generateBridgeId(projectName, routerAddress) {
    const raw = `${projectName.toLowerCase()}_${routerAddress.toLowerCase()}`;
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 6);
    const cleanName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${cleanName}_${hash}`;
}

async function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    let projectName = "";
    let routerAddress = "";

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--name") projectName = args[i + 1];
        if (args[i] === "--address") routerAddress = args[i + 1];
    }

    if (!projectName) {
        projectName = await prompt("Enter your project name (e.g. MyBridge): ");
    }

    if (!routerAddress) {
        console.log("\n⚠️  Router not deployed yet? No problem, use a placeholder.\n");
        routerAddress = await prompt("Enter router address (or press Enter to skip): ");
        if (!routerAddress) {
            routerAddress = "0x0000000000000000000000000000000000000000";
        }
    }

    const bridgeId = generateBridgeId(projectName, routerAddress);

    console.log("\n✅ Your Bridge ID:\n");
    console.log(`   ${bridgeId}\n`);
    console.log("Add this to your .env:\n");
    console.log(`   NEXT_PUBLIC_BRIDGE_ID=${bridgeId}\n`);
    console.log("Use it in your frontend:\n");
    console.log(`   import { BridgeAnalytics } from "bridge-id-sdk"`);
    console.log(`\n   const sdk = new BridgeAnalytics({`);
    console.log(`     bridgeId: "${bridgeId}",`);
    console.log(`     apiUrl: "https://your-backend.xyz"`);
    console.log(`   })\n`);
    console.log("⚠️  Never change this ID. All transactions are linked to it.\n");
}

main().catch(console.error);