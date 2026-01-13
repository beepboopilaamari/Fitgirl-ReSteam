import React, { useState } from 'react';
import { Modal, Card, Row, Col, Typography, Slider } from 'antd';
import { 
  RobotOutlined, 
  FireOutlined, 
  HeartOutlined, 
  ThunderboltOutlined,
  TrophyOutlined,
  RocketOutlined,
  GiftOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface AIRecommendationOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

interface AIRecommendationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (optionId: string, params?: any) => void;
}

const AIRecommendationModal: React.FC<AIRecommendationModalProps> = ({ 
  visible, 
  onClose, 
  onSelectOption 
}) => {
  const [sizeFilter, setSizeFilter] = useState<[number, number]>([0, 100]);
  const [showSizeSlider, setShowSizeSlider] = useState(false);

  const options: AIRecommendationOption[] = [
    {
      id: 'library-based',
      title: 'Based on My Library',
      description: 'Personalized picks matching your gaming taste',
      icon: <HeartOutlined />,
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
    },
    {
      id: 'trending',
      title: "What's Hot Right Now",
      description: 'Latest and most popular repacks',
      icon: <FireOutlined />,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
    },
    {
      id: 'hidden-gems',
      title: 'Hidden Gems',
      description: 'Underrated classics you might have missed',
      icon: <TrophyOutlined />,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)'
    },
    {
      id: 'quick-play',
      title: 'Quick Downloads',
      description: 'Small-sized games you can play tonight',
      icon: <ThunderboltOutlined />,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)'
    },
    {
      id: 'epic-adventure',
      title: 'Epic Adventures',
      description: 'Massive open-world and story-driven games',
      icon: <RocketOutlined />,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      id: 'random-surprise',
      title: 'Surprise Me!',
      description: 'Random pick that fits your preferences',
      icon: <GiftOutlined />,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    },
    {
      id: 'recent-releases',
      title: 'Fresh Releases',
      description: 'Games from the last 3 months',
      icon: <ClockCircleOutlined />,
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    },
    {
      id: 'size-specific',
      title: 'Choose by Size',
      description: 'Pick games within your size preference',
      icon: <RobotOutlined />,
      color: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
  ];

  const handleOptionClick = (optionId: string) => {
    if (optionId === 'size-specific') {
      setShowSizeSlider(true);
    } else {
      onSelectOption(optionId);
      onClose();
    }
  };

  const handleSizeConfirm = () => {
    onSelectOption('size-specific', { sizeRange: sizeFilter });
    setShowSizeSlider(false);
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RobotOutlined style={{ fontSize: 24, color: '#667eea' }} />
          <span style={{ fontSize: 20, fontWeight: 700 }}>AI Recommendations</span>
        </div>
      }
      open={visible}
      onCancel={() => {
        setShowSizeSlider(false);
        onClose();
      }}
      footer={null}
      width={900}
      style={{ top: 40 }}
      bodyStyle={{ padding: 24 }}
    >
      {!showSizeSlider ? (
        <>
          <Text style={{ display: 'block', marginBottom: 24, color: '#94a3b8', fontSize: 14 }}>
            Choose how you'd like AI to recommend games from your catalog
          </Text>
          
          <Row gutter={[16, 16]}>
            {options.map(option => (
              <Col key={option.id} xs={24} sm={12} md={12}>
                <Card
                  hoverable
                  onClick={() => handleOptionClick(option.id)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    height: '100%'
                  }}
                  bodyStyle={{ padding: 20 }}
                  className="ai-option-card"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div 
                      style={{ 
                        fontSize: 32,
                        background: option.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        lineHeight: 1
                      }}
                    >
                      {option.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Title level={5} style={{ margin: 0, marginBottom: 8, color: '#e2e8f0' }}>
                        {option.title}
                      </Title>
                      <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                        {option.description}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <div style={{ padding: '20px 0' }}>
          <Title level={4} style={{ marginBottom: 24, color: '#e2e8f0' }}>
            Choose Game Size Range
          </Title>
          <Text style={{ display: 'block', marginBottom: 32, color: '#94a3b8' }}>
            Select the size range for games you want to download
          </Text>
          
          <div style={{ padding: '0 20px', marginBottom: 40 }}>
            <Slider
              range
              min={0}
              max={100}
              value={sizeFilter}
              onChange={(value) => setSizeFilter(value as [number, number])}
              marks={{
                0: '0 GB',
                25: '25 GB',
                50: '50 GB',
                75: '75 GB',
                100: '100+ GB'
              }}
              tooltip={{
                formatter: (value) => `${value} GB`
              }}
            />
          </div>

          <div style={{ 
            padding: 16, 
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(102, 126, 234, 0.3)',
            marginBottom: 24
          }}>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
              AI will recommend games between <strong style={{ color: '#60a5fa' }}>{sizeFilter[0]} GB</strong> and <strong style={{ color: '#60a5fa' }}>{sizeFilter[1]} GB</strong>
            </Text>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Card
              hoverable
              onClick={() => setShowSizeSlider(false)}
              style={{
                background: 'rgba(71, 85, 105, 0.4)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                cursor: 'pointer',
                padding: '12px 24px'
              }}
              bodyStyle={{ padding: 0 }}
            >
              <Text style={{ color: '#94a3b8', fontWeight: 600 }}>Back</Text>
            </Card>
            <Card
              hoverable
              onClick={handleSizeConfirm}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 32px'
              }}
              bodyStyle={{ padding: 0 }}
            >
              <Text style={{ color: '#fff', fontWeight: 600 }}>Get Recommendations</Text>
            </Card>
          </div>
        </div>
      )}

      <style>{`
        .ai-option-card:hover {
          border-color: rgba(102, 126, 234, 0.5) !important;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </Modal>
  );
};

export default AIRecommendationModal;
