import React, { useState, useEffect } from 'react';
import { Modal, Tabs, List, Statistic, Row, Col, Empty, Spin, Select } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, TrophyOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Option } = Select;

interface PlaytimeSession {
  id: number;
  installation_id: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}

interface PlaytimeStats {
  total_seconds: number;
  session_count: number;
  average_session_seconds: number;
  longest_session_seconds: number;
}

interface PlaytimeModalProps {
  visible: boolean;
  onClose: () => void;
  installationId: number;
  gameName?: string;
}

const PlaytimeModal: React.FC<PlaytimeModalProps> = ({ visible, onClose, installationId, gameName }) => {
  const [sessions, setSessions] = useState<PlaytimeSession[]>([]);
  const [stats, setStats] = useState<PlaytimeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, statsPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsData, statsData] = await Promise.all([
        window.electronAPI.getPlaytimeSessions(installationId),
        window.electronAPI.getPlaytimeStats(installationId, statsPeriod)
      ]);
      setSessions(sessionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load playtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Modal
      title={`Playtime - ${gameName || 'Game'}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Tabs defaultActiveKey="stats">
        <TabPane tab="Statistics" key="stats">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : stats ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#94a3b8', marginRight: 8 }}>Filter:</label>
                <Select
                  value={statsPeriod}
                  onChange={setStatsPeriod}
                  style={{ width: 200 }}
                  placeholder="All time"
                >
                  <Option value={undefined}>All time</Option>
                  <Option value="day">Last 24 hours</Option>
                  <Option value="week">Last week</Option>
                  <Option value="month">Last month</Option>
                </Select>
              </div>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(15, 20, 30, 0.6)',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: 24,
                    textAlign: 'center'
                  }}>
                    <ClockCircleOutlined style={{ fontSize: 32, color: '#6ddcff', marginBottom: 12 }} />
                    <Statistic
                      title={<span style={{ color: '#94a3b8' }}>Total Playtime</span>}
                      value={formatDuration(stats.total_seconds)}
                      valueStyle={{ color: '#bfe9ff', fontSize: 28 }}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(15, 20, 30, 0.6)',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: 24,
                    textAlign: 'center'
                  }}>
                    <CalendarOutlined style={{ fontSize: 32, color: '#6ddcff', marginBottom: 12 }} />
                    <Statistic
                      title={<span style={{ color: '#94a3b8' }}>Sessions</span>}
                      value={stats.session_count}
                      valueStyle={{ color: '#bfe9ff', fontSize: 28 }}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(15, 20, 30, 0.6)',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: 24,
                    textAlign: 'center'
                  }}>
                    <TrophyOutlined style={{ fontSize: 32, color: '#6ddcff', marginBottom: 12 }} />
                    <Statistic
                      title={<span style={{ color: '#94a3b8' }}>Average Session</span>}
                      value={formatDuration(stats.average_session_seconds)}
                      valueStyle={{ color: '#bfe9ff', fontSize: 28 }}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{
                    background: 'rgba(15, 20, 30, 0.6)',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: 24,
                    textAlign: 'center'
                  }}>
                    <TrophyOutlined style={{ fontSize: 32, color: '#6ddcff', marginBottom: 12 }} />
                    <Statistic
                      title={<span style={{ color: '#94a3b8' }}>Longest Session</span>}
                      value={formatDuration(stats.longest_session_seconds)}
                      valueStyle={{ color: '#bfe9ff', fontSize: 28 }}
                    />
                  </div>
                </Col>
              </Row>
            </div>
          ) : (
            <Empty description="No playtime data available" />
          )}
        </TabPane>

        <TabPane tab="Session History" key="history">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : sessions.length > 0 ? (
            <List
              dataSource={sessions}
              renderItem={(session) => (
                <List.Item
                  style={{
                    background: 'rgba(15, 20, 30, 0.4)',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    marginBottom: 8,
                    padding: 16
                  }}
                >
                  <List.Item.Meta
                    avatar={<ClockCircleOutlined style={{ fontSize: 24, color: '#6ddcff' }} />}
                    title={
                      <div style={{ color: '#bfe9ff', fontSize: 16 }}>
                        {formatDuration(session.duration_seconds)}
                      </div>
                    }
                    description={
                      <div style={{ color: '#94a3b8', fontSize: 13 }}>
                        <div>Started: {formatDate(session.start_time)}</div>
                        <div>Ended: {formatDate(session.end_time)}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No sessions recorded yet" />
          )}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default PlaytimeModal;
