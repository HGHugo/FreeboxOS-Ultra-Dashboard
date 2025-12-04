import { Router } from 'express';
import { freeboxApi } from '../services/freeboxApi.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ===== DHCP =====

// GET /api/settings/dhcp - Get DHCP config
router.get('/dhcp', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDhcpConfig();
  res.json(result);
}));

// PUT /api/settings/dhcp - Update DHCP config
router.put('/dhcp', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateDhcpConfig(req.body);
  res.json(result);
}));

// GET /api/settings/dhcp/leases - Get DHCP leases
router.get('/dhcp/leases', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDhcpLeases();
  res.json(result);
}));

// GET /api/settings/dhcp/static - Get static leases
router.get('/dhcp/static', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDhcpStaticLeases();
  res.json(result);
}));

// POST /api/settings/dhcp/static - Create static lease
router.post('/dhcp/static', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createDhcpStaticLease(req.body);
  res.json(result);
}));

// DELETE /api/settings/dhcp/static/:id - Delete static lease
router.delete('/dhcp/static/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deleteDhcpStaticLease(req.params.id);
  res.json(result);
}));

// ===== FTP =====

// GET /api/settings/ftp - Get FTP config
router.get('/ftp', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getFtpConfig();
  res.json(result);
}));

// PUT /api/settings/ftp - Update FTP config
router.put('/ftp', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateFtpConfig(req.body);
  res.json(result);
}));

// ===== VPN Server =====

// GET /api/settings/vpn/servers - List all VPN servers (openvpn_routed, openvpn_bridge, pptp)
router.get('/vpn/servers', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getVpnServers();
  res.json(result);
}));

// GET /api/settings/vpn/servers/:id - Get specific VPN server
router.get('/vpn/servers/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getVpnServer(req.params.id);
  res.json(result);
}));

// GET /api/settings/vpn/servers/:id/config - Get VPN server config
router.get('/vpn/servers/:id/config', asyncHandler(async (req, res) => {
  const result = await freeboxApi.getVpnServerConfig(req.params.id);
  res.json(result);
}));

// PUT /api/settings/vpn/servers/:id/config - Update VPN server config
router.put('/vpn/servers/:id/config', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateVpnServerConfig(req.params.id, req.body);
  res.json(result);
}));

// POST /api/settings/vpn/servers/:id/start - Start VPN server
router.post('/vpn/servers/:id/start', asyncHandler(async (req, res) => {
  const result = await freeboxApi.startVpnServer(req.params.id);
  res.json(result);
}));

// POST /api/settings/vpn/servers/:id/stop - Stop VPN server
router.post('/vpn/servers/:id/stop', asyncHandler(async (req, res) => {
  const result = await freeboxApi.stopVpnServer(req.params.id);
  res.json(result);
}));

// Legacy route for backward compatibility
router.get('/vpn/server', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getVpnServers();
  res.json(result);
}));

// PUT /api/settings/vpn/server - Update VPN server config (legacy)
router.put('/vpn/server', asyncHandler(async (req, res) => {
  // For legacy, assume openvpn_routed
  const result = await freeboxApi.updateVpnServerConfig('openvpn_routed', req.body);
  res.json(result);
}));

// GET /api/settings/vpn/users - Get VPN users
router.get('/vpn/users', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getVpnUsers();
  res.json(result);
}));

// POST /api/settings/vpn/users - Create VPN user
router.post('/vpn/users', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createVpnUser(req.body);
  res.json(result);
}));

// DELETE /api/settings/vpn/users/:login - Delete VPN user
router.delete('/vpn/users/:login', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deleteVpnUser(req.params.login);
  res.json(result);
}));

// GET /api/settings/vpn/connections - Get active VPN connections
router.get('/vpn/connections', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getVpnConnections();
  res.json(result);
}));

// ===== VPN Client =====

// GET /api/settings/vpn/client - Get VPN client configs
router.get('/vpn/client', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getVpnClientConfigs();
  res.json(result);
}));

// GET /api/settings/vpn/client/status - Get VPN client status
router.get('/vpn/client/status', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getVpnClientStatus();
  res.json(result);
}));

// ===== Port Forwarding =====

// GET /api/settings/nat/redirections - Get port forwarding rules
router.get('/nat/redirections', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getPortForwardingRules();
  res.json(result);
}));

// POST /api/settings/nat/redirections - Create port forwarding rule
router.post('/nat/redirections', asyncHandler(async (req, res) => {
  const result = await freeboxApi.createPortForwardingRule(req.body);
  res.json(result);
}));

// PUT /api/settings/nat/redirections/:id - Update port forwarding rule
router.put('/nat/redirections/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updatePortForwardingRule(parseInt(req.params.id), req.body);
  res.json(result);
}));

// DELETE /api/settings/nat/redirections/:id - Delete port forwarding rule
router.delete('/nat/redirections/:id', asyncHandler(async (req, res) => {
  const result = await freeboxApi.deletePortForwardingRule(parseInt(req.params.id));
  res.json(result);
}));

// GET /api/settings/nat/dmz - Get DMZ config
router.get('/nat/dmz', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getDmzConfig();
  res.json(result);
}));

// PUT /api/settings/nat/dmz - Update DMZ config
router.put('/nat/dmz', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateDmzConfig(req.body);
  res.json(result);
}));

// ===== Switch / Ports =====

// GET /api/settings/switch - Get switch status
router.get('/switch', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getSwitchStatus();
  res.json(result);
}));

// GET /api/settings/switch/ports - Get switch ports
router.get('/switch/ports', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getSwitchPorts();
  res.json(result);
}));

// ===== LCD =====

// GET /api/settings/lcd - Get LCD config
router.get('/lcd', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getLcdConfig();
  res.json(result);
}));

// PUT /api/settings/lcd - Update LCD config
router.put('/lcd', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateLcdConfig(req.body);
  res.json(result);
}));

// ===== Freeplugs =====

// GET /api/settings/freeplugs - Get freeplugs
router.get('/freeplugs', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getFreeplugs();
  res.json(result);
}));

// ===== Connection / IP Config =====

// GET /api/settings/connection - Get connection config
router.get('/connection', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getConnectionConfig();
  res.json(result);
}));

// PUT /api/settings/connection - Update connection config
router.put('/connection', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateConnectionConfig(req.body);
  res.json(result);
}));

// GET /api/settings/connection/ipv6 - Get IPv6 config
router.get('/connection/ipv6', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getIpv6Config();
  res.json(result);
}));

// PUT /api/settings/connection/ipv6 - Update IPv6 config
router.put('/connection/ipv6', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateIpv6Config(req.body);
  res.json(result);
}));

// GET /api/settings/connection/ftth - Get FTTH info
router.get('/connection/ftth', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getFtthInfo();
  res.json(result);
}));

// ===== LAN Config =====

// GET /api/settings/lan - Get LAN config
router.get('/lan', asyncHandler(async (_req, res) => {
  const result = await freeboxApi.getLanConfig();
  res.json(result);
}));

// PUT /api/settings/lan - Update LAN config
router.put('/lan', asyncHandler(async (req, res) => {
  const result = await freeboxApi.updateLanConfig(req.body);
  res.json(result);
}));

export default router;