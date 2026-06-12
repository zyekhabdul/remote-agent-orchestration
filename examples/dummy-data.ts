/**
 * Example: Dummy Agent Registration
 * Shows how to register and manage agents
 */

import { AgentManager } from '@core/agent_manager';
import { CommandRouter } from '@core/command_router';
import { CommandStatus } from '@types/command.types';

// Create manager instances
const agentManager = new AgentManager();
const commandRouter = new CommandRouter();

// Register dummy agents
function registerDummyAgents() {
  console.log('📦 Registering dummy agents...\n');

  // Agent 1: Linux Server
  const agent1 = agentManager.registerAgent({
    name: 'prod-server-01',
    metadata: {
      version: '2.1.0',
      platform: 'Linux',
      architecture: 'x86_64',
      osVersion: '5.10.0-8-amd64',
      hostname: 'prod-server-01.internal',
      timezone: 'UTC',
    },
    capabilities: [
      { name: 'shell', version: '1.0', enabled: true },
      { name: 'file-transfer', version: '1.0', enabled: true },
      { name: 'monitoring', version: '2.0', enabled: true },
    ],
    resources: {
      cpu: 45,
      memory: 8192,
      disk: 102400,
      bandwidth: 1000,
    },
    tags: {
      environment: 'production',
      region: 'us-east-1',
      team: 'platform',
    },
  });

  console.log(`✅ Agent 1 registered: ${agent1.id}`);
  console.log(`   Name: ${agent1.name}`);
  console.log(`   Status: ${agent1.status}`);
  console.log(`   Capabilities: ${agent1.capabilities.map((c) => c.name).join(', ')}\n`);

  // Agent 2: Windows Server
  const agent2 = agentManager.registerAgent({
    name: 'win-server-02',
    metadata: {
      version: '2.0.0',
      platform: 'Windows',
      architecture: 'x86_64',
      osVersion: '10.0.19041',
      hostname: 'win-server-02.internal',
      timezone: 'EST',
    },
    capabilities: [
      { name: 'powershell', version: '7.0', enabled: true },
      { name: 'file-transfer', version: '1.0', enabled: true },
      { name: 'windows-events', version: '1.0', enabled: true },
    ],
    resources: {
      cpu: 35,
      memory: 16384,
      disk: 512000,
      bandwidth: 500,
    },
    tags: {
      environment: 'production',
      region: 'us-west-2',
      team: 'windows-ops',
    },
  });

  console.log(`✅ Agent 2 registered: ${agent2.id}`);
  console.log(`   Name: ${agent2.name}`);
  console.log(`   Status: ${agent2.status}`);
  console.log(`   Capabilities: ${agent2.capabilities.map((c) => c.name).join(', ')}\n`);

  // Agent 3: Kubernetes Node
  const agent3 = agentManager.registerAgent({
    name: 'k8s-node-03',
    metadata: {
      version: '1.25.0',
      platform: 'Linux',
      architecture: 'arm64',
      osVersion: '5.15.0',
      hostname: 'k8s-node-03.cluster',
      timezone: 'UTC',
    },
    capabilities: [
      { name: 'kubectl', version: '1.25', enabled: true },
      { name: 'docker', version: '20.10', enabled: true },
      { name: 'metrics', version: '1.0', enabled: true },
    ],
    resources: {
      cpu: 20,
      memory: 4096,
      disk: 51200,
      bandwidth: 10000,
    },
    tags: {
      environment: 'staging',
      region: 'eu-central-1',
      team: 'platform',
      cluster: 'eks-staging',
    },
  });

  console.log(`✅ Agent 3 registered: ${agent3.id}`);
  console.log(`   Name: ${agent3.name}`);
  console.log(`   Status: ${agent3.status}`);
  console.log(`   Capabilities: ${agent3.capabilities.map((c) => c.name).join(', ')}\n`);

  return [agent1, agent2, agent3];
}

// Update agent statuses
function updateAgentStatuses(agents: any[]) {
  console.log('🔄 Updating agent statuses...\n');

  agents.forEach((agent, index) => {
    const statuses = ['online', 'online', 'unhealthy'];
    agentManager.updateAgentStatus(agent.id, statuses[index]);
    console.log(`   ${agent.name}: ${statuses[index]}`);
  });

  console.log();
}

// Submit dummy commands
function submitDummyCommands(agents: any[]) {
  console.log('📤 Submitting dummy commands...\n');

  // Command 1: Shell command
  const cmd1 = commandRouter.createCommand({
    name: 'System Health Check',
    module: 'shell',
    action: 'execute',
    parameters: {
      command: 'curl https://health.example.com',
    },
    target: { agentCapability: 'shell' },
    priority: 'high',
    timeout: 30000,
  });

  const routing1 = commandRouter.routeCommand(cmd1);
  console.log(`✅ Command 1: ${cmd1.name}`);
  console.log(`   ID: ${cmd1.id}`);
  console.log(`   Status: ${cmd1.status}`);
  console.log(`   Target: ${cmd1.target.agentCapability}`);
  console.log(`   Selected Agents: ${routing1.selectedAgents.length}\n`);

  // Command 2: File transfer
  const cmd2 = commandRouter.createCommand({
    name: 'Deploy Config Files',
    module: 'file-transfer',
    action: 'push',
    parameters: {
      source: '/configs/app.yaml',
      destination: '/opt/app/config/',
      recursive: true,
    },
    target: {
      agentTag: {
        environment: 'production',
      },
    },
    priority: 'normal',
    timeout: 60000,
  });

  const routing2 = commandRouter.routeCommand(cmd2);
  console.log(`✅ Command 2: ${cmd2.name}`);
  console.log(`   ID: ${cmd2.id}`);
  console.log(`   Status: ${cmd2.status}`);
  console.log(`   Target: agents with tag environment=production`);
  console.log(`   Selected Agents: ${routing2.selectedAgents.length}\n`);

  // Command 3: Kubernetes command
  const cmd3 = commandRouter.createCommand({
    name: 'Get Pod Metrics',
    module: 'kubectl',
    action: 'get',
    parameters: {
      resource: 'pods',
      namespace: 'default',
      format: 'json',
    },
    target: { agentCapability: 'kubectl' },
    priority: 'normal',
    timeout: 15000,
  });

  const routing3 = commandRouter.routeCommand(cmd3);
  console.log(`✅ Command 3: ${cmd3.name}`);
  console.log(`   ID: ${cmd3.id}`);
  console.log(`   Status: ${cmd3.status}`);
  console.log(`   Target: agents with kubectl capability`);
  console.log(`   Selected Agents: ${routing3.selectedAgents.length}\n`);
}

// Display statistics
function displayStatistics() {
  console.log('📊 System Statistics:\n');

  const agentStats = agentManager.getStatistics();
  console.log('Agents:');
  console.log(`   Total: ${agentStats.total}`);
  console.log(`   Online: ${agentStats.byStatus.online}`);
  console.log(`   Offline: ${agentStats.byStatus.offline}`);
  console.log(`   Unhealthy: ${agentStats.byStatus.unhealthy}`);
  console.log(`   Capabilities: ${agentStats.capabilities.length}\n`);

  const commandStats = commandRouter.getStatistics();
  console.log('Commands:');
  console.log(`   Queued: ${commandStats.queuedCommands}`);
  console.log(`   Executed: ${commandStats.executedCommands}`);
  console.log(`   By Status:`);
  console.log(`     - Pending: ${commandStats.commandsByStatus.pending}`);
  console.log(`     - Queued: ${commandStats.commandsByStatus.queued}`);
  console.log(`     - Running: ${commandStats.commandsByStatus.running}\n`);
}

// Run example
function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   REMOTE AGENT ORCHESTRATION - DUMMY DATA EXAMPLE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const agents = registerDummyAgents();
  updateAgentStatuses(agents);
  submitDummyCommands(agents);
  displayStatistics();

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Execute
if (require.main === module) {
  main();
}

export { registerDummyAgents, updateAgentStatuses, submitDummyCommands, displayStatistics };
