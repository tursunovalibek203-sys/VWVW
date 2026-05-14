import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Bot, 
  Settings, 
  BarChart3, 
  Bell, 
  UserPlus,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Globe,
  Smartphone
} from 'lucide-react';
import { 
  telegramBot, 
  TelegramUser, 
  TelegramMessage, 
  NotificationType,
  startBot,
  UserRole 
} from '../lib/professionalTelegramBot';

interface TelegramDashboardProps {
  refreshInterval?: number;
  showCharts?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function ProfessionalTelegramDashboard({
  refreshInterval = 15000,
  showCharts = true,
  showDetails = true,
  className = '',
}: TelegramDashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadDashboardData = () => {
    try {
      setRefreshing(true);
      
      const bot = telegramBot();
      const analyticsData = bot.getAnalytics();
      const usersData = bot.getUsers();
      
      setAnalytics(analyticsData);
      setUsers(usersData);
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error('Failed to load Telegram dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartBot = async () => {
    try {
      if (isRunning) {
        telegramBot().stop();
        setIsRunning(false);
      } else {
        await startBot();
        setIsRunning(true);
      }
    } catch (error) {
      console.error('Failed to start/stop bot:', error);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <Shield className="w-4 h-4" />;
      case UserRole.MANAGER: return <BarChart3 className="w-4 h-4" />;
      case UserRole.EMPLOYEE: return <Users className="w-4 h-4" />;
      case UserRole.CUSTOMER: return <UserPlus className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'text-red-600';
      case UserRole.MANAGER: return 'text-purple-600';
      case UserRole.EMPLOYEE: return 'text-blue-600';
      case UserRole.CUSTOMER: return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSendNotification = async (notification: NotificationType) => {
    try {
      await telegramBot().sendNotification(notification);
      setShowNotificationModal(false);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleUpdateUserRole = (userId: number, newRole: UserRole) => {
    try {
      telegramBot().updateUserRole(userId, newRole);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Unable to load Telegram bot data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            isRunning ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Bot className={`w-6 h-6 ${isRunning ? 'text-green-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Telegram Bot Dashboard</h2>
            <p className="text-sm text-gray-500">
              Status: <span className={`font-medium ${isRunning ? 'text-green-600' : 'text-gray-600'}`}>
                {isRunning ? 'Running' : 'Stopped'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={handleStartBot}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isRunning 
                ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                : 'bg-green-100 hover:bg-green-200 text-green-600'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Bot
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Bot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {analytics.totalUsers.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Users</p>
          <p className="text-xs text-gray-500 mt-1">
            {analytics.activeUsers} active today
          </p>
        </div>

        {/* Total Messages */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {analytics.totalMessages.toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Messages</p>
          <p className="text-xs text-gray-500 mt-1">
            Avg response: {analytics.responseTime}ms
          </p>
        </div>

        {/* Commands Used */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {Object.values(analytics.commandsUsed as Record<string, number>).reduce((sum, count) => sum + count, 0).toLocaleString()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Commands Used</p>
          <p className="text-xs text-gray-500 mt-1">
            Most popular: /help
          </p>
        </div>

        {/* Error Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {(analytics.errorRate * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Error Rate</p>
          <p className="text-xs text-gray-500 mt-1">
            {analytics.errorRate < 0.05 ? 'Good' : 'Needs attention'}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Export Users
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.slice(0, 10).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.firstName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.username ? `@${user.username}` : `ID: ${user.id}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span className={`text-sm font-medium ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.notifications.sales && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Sales
                        </span>
                      )}
                      {user.notifications.customers && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Customers
                        </span>
                      )}
                      {user.notifications.products && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Products
                        </span>
                      )}
                      {user.notifications.alerts && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Alerts
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.registeredAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.lastActivity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View user"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900" title="Edit user">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Command Statistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Command Usage</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View Details
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Popular Commands</h4>
            <div className="space-y-3">
              {Object.entries(analytics.commandsUsed as Record<string, number>)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([command, count]) => (
                  <div key={command} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">/{command}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ 
                            width: `${((count as number) / Math.max(...Object.values(analytics.commandsUsed as Record<string, number>))) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-8 text-right">{count as number}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Message Types</h4>
            <div className="space-y-3">
              {Object.entries(analytics.messageTypes as Record<string, number>)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 capitalize">{type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ 
                            width: `${((count as number) / Math.max(...Object.values(analytics.messageTypes as Record<string, number>))) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-8 text-right">{count as number}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setShowNotificationModal(true)}
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900">Send Notification</p>
              <p className="text-xs text-blue-700">Broadcast message</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <UserPlus className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-900">Add User</p>
              <p className="text-xs text-green-700">Register new user</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-purple-900">Bot Settings</p>
              <p className="text-xs text-purple-700">Configure bot</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
            <Download className="w-5 h-5 text-orange-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-orange-900">Export Data</p>
              <p className="text-xs text-orange-700">Download analytics</p>
            </div>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Bot Settings
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
          <BarChart3 className="w-4 h-4" />
          Analytics Reports
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Data
        </button>
      </div>

      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Send Notification</h3>
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                  title="Close"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" title="Notification type">
                    <option value="sale">Sale Notification</option>
                    <option value="customer">Customer Update</option>
                    <option value="product">Product Alert</option>
                    <option value="report">Report Summary</option>
                    <option value="system">System Message</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter notification title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Enter notification message"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" title="Priority">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm text-gray-700">All Users</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm text-gray-700">Admin Users</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm text-gray-700">Active Users</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSendNotification({
                    type: 'system',
                    title: 'Test Notification',
                    message: 'This is a test notification from the dashboard',
                    priority: 'medium',
                    recipients: [],
                  })}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Send Notification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
