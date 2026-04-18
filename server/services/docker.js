import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function getDockerInfo() {
  try {
    const containers = await docker.listContainers({ all: true });

    return containers.map(container => ({
      name: container.Names[0].replace('/', ''),
      status: container.Status,
      state: container.State
    }));
  } catch (error) {
    console.error('Error getting Docker info:', error);
    // Return empty array if Docker is not available
    return [];
  }
}