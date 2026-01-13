import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Button, Input, Space, Tag, message, Spin, Pagination, Select, Slider, Collapse, Divider } from 'antd';
import { DownloadOutlined, SearchOutlined, FilterOutlined, ClockCircleOutlined, RobotOutlined, LoadingOutlined } from '@ant-design/icons';
import { Game } from '../../shared/types';
import FileSelectionModal from '../components/FileSelectionModal';
import AIRecommendationModal from '../components/AIRecommendationModal';

const { Title } = Typography;
const { Search } = Input;
const { Panel } = Collapse;

// Dayjs replacement - simple date functions
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Unknown date';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isAfter = (date1: string, date2: Date) => {
  return new Date(date1) > date2;
};

const subtractDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const subtractMonths = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

const BrowseView: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Recommendations state
  const [aiRecommendations, setAiRecommendations] = useState<Game[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [currentRecommendationType, setCurrentRecommendationType] = useState<string>('');
  
  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sizeRange, setSizeRange] = useState<[number, number]>([0, 300]);
  const [dateRange, setDateRange] = useState<string>('all');
  const [companySearch, setCompanySearch] = useState('');
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  
  // Sort states
  const [sortBy, setSortBy] = useState<string>('repack_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [fileSelectionVisible, setFileSelectionVisible] = useState(false);
  const [torrentFiles, setTorrentFiles] = useState<any[]>([]);
  const [fileFetching, setFileFetching] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameTitle, setSelectedGameTitle] = useState('');

  useEffect(() => {
    loadAllGames();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [games, searchTerm, selectedGenres, sizeRange, dateRange, companySearch]);

  const loadAllGames = async () => {
    setLoading(true);
    try {
      // Load all games with sorting
      const data = await window.electronAPI.getGames(10000, 0, sortBy, sortOrder);
      const gamesWithMagnets = data.filter(game => game.magnet_link && game.magnet_link.trim() !== '');
      setGames(gamesWithMagnets);
      
      // Extract unique genres
      const genresSet = new Set<string>();
      gamesWithMagnets.forEach(game => {
        game.genres.forEach(genre => {
          if (genre && genre !== 'Unknown') {
            genresSet.add(genre);
          }
        });
      });
      setAvailableGenres(Array.from(genresSet).sort());
    } catch (error) {
      message.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...games];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(game =>
        game.title.toLowerCase().includes(lowerSearch) ||
        game.companies.toLowerCase().includes(lowerSearch) ||
        game.description.toLowerCase().includes(lowerSearch)
      );
    }

    // Genre filter
    if (selectedGenres.length > 0) {
      filtered = filtered.filter(game =>
        selectedGenres.some(genre => game.genres.includes(genre))
      );
    }

    // Size filter
    filtered = filtered.filter(game => {
      const sizeMB = game.repack_size_min_mb || game.repack_size_mb;
      const sizeGB = sizeMB / 1024;
      return sizeGB >= sizeRange[0] && sizeGB <= sizeRange[1];
    });

    // Date filter
    if (dateRange !== 'all') {
      filtered = filtered.filter(game => {
        if (!game.repack_date) return false;
        
        switch (dateRange) {
          case '7d':
            return isAfter(game.repack_date, subtractDays(7));
          case '30d':
            return isAfter(game.repack_date, subtractDays(30));
          case '3m':
            return isAfter(game.repack_date, subtractMonths(3));
          case '1y':
            return isAfter(game.repack_date, subtractMonths(12));
          default:
            return true;
        }
      });
    }

    // Company filter
    if (companySearch) {
      const lowerCompany = companySearch.toLowerCase();
      filtered = filtered.filter(game =>
        game.companies.toLowerCase().includes(lowerCompany)
      );
    }

    setFilteredGames(filtered);
    setCurrentPage(1);
  };

  const handleAIOptionSelect = async (optionId: string, params?: any) => {
    setLoadingRecommendations(true);
    setCurrentRecommendationType(optionId);
    
    try {
      let recommendations: Game[] = [];
      
      switch (optionId) {
        case 'library-based':
          // Use AI to analyze library
          const aiResult = await window.electronAPI.getAIRecommendations(12);
          if (aiResult.success && aiResult.recommendations) {
            recommendations = aiResult.recommendations;
            message.success('AI analyzed your library and picked these games!');
          } else {
            throw new Error(aiResult.error || 'AI recommendation failed');
          }
          break;
          
        case 'trending':
          // Get newest games from last 30 days
          recommendations = games
            .filter(g => {
              if (!g.repack_date) return false;
              return isAfter(g.repack_date, subtractDays(30));
            })
            .sort((a, b) => new Date(b.repack_date).getTime() - new Date(a.repack_date).getTime())
            .slice(0, 12);
          message.success("Here's what's hot right now!");
          break;
          
        case 'hidden-gems':
          // Get older games (6-24 months old) with specific genres
          recommendations = games
            .filter(g => {
              if (!g.repack_date) return false;
              const date = new Date(g.repack_date);
              return date < subtractMonths(6) && date > subtractMonths(24);
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, 12);
          message.success('Discovered some hidden gems for you!');
          break;
          
        case 'quick-play':
          // Games under 20GB
          recommendations = games
            .filter(g => {
              const sizeMB = g.repack_size_min_mb || g.repack_size_mb;
              return sizeMB < 20 * 1024;
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, 12);
          message.success('Quick downloads ready to play tonight!');
          break;
          
        case 'epic-adventure':
          // Large games (>30GB) with RPG, Adventure, or Action genres
          recommendations = games
            .filter(g => {
              const sizeMB = g.repack_size_min_mb || g.repack_size_mb;
              const hasEpicGenre = g.genres.some(genre => 
                ['RPG', 'Adventure', 'Action', 'Open World'].some(epic => 
                  genre.toLowerCase().includes(epic.toLowerCase())
                )
              );
              return sizeMB > 30 * 1024 && hasEpicGenre;
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, 12);
          message.success('Epic adventures await!');
          break;
          
        case 'random-surprise':
          // Completely random
          recommendations = games
            .sort(() => Math.random() - 0.5)
            .slice(0, 12);
          message.success('Surprise! Here are some random picks!');
          break;
          
        case 'recent-releases':
          // Last 3 months
          recommendations = games
            .filter(g => {
              if (!g.repack_date) return false;
              return isAfter(g.repack_date, subtractMonths(3));
            })
            .sort((a, b) => new Date(b.repack_date).getTime() - new Date(a.repack_date).getTime())
            .slice(0, 12);
          message.success('Fresh releases just for you!');
          break;
          
        case 'size-specific':
          // Filter by size range
          const [minGB, maxGB] = params.sizeRange;
          recommendations = games
            .filter(g => {
              const sizeMB = g.repack_size_min_mb || g.repack_size_mb;
              const sizeGB = sizeMB / 1024;
              return sizeGB >= minGB && sizeGB <= maxGB;
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, 12);
          message.success(`Found games between ${minGB}GB and ${maxGB}GB!`);
          break;
      }
      
      if (recommendations.length === 0) {
        message.warning('No games found matching this criteria. Try another option!');
      } else {
        setAiRecommendations(recommendations);
        setShowRecommendations(true);
      }
    } catch (error) {
      message.error('Failed to load recommendations');
      console.error('AI recommendation error:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const getRecommendationTitle = () => {
    switch (currentRecommendationType) {
      case 'library-based': return 'AI Recommendations Based on Your Library';
      case 'trending': return "🔥 What's Hot Right Now";
      case 'hidden-gems': return '💎 Hidden Gems';
      case 'quick-play': return '⚡ Quick Downloads';
      case 'epic-adventure': return '🚀 Epic Adventures';
      case 'random-surprise': return '🎁 Random Surprise';
      case 'recent-releases': return '🆕 Fresh Releases';
      case 'size-specific': return '📦 Size-Specific Picks';
      default: return 'AI Recommendations For You';
    }
  };

  const getRecommendationSubtitle = () => {
    switch (currentRecommendationType) {
      case 'library-based': return 'Personalized picks matching your gaming taste';
      case 'trending': return 'Latest and most popular repacks from the last month';
      case 'hidden-gems': return 'Underrated classics you might have missed';
      case 'quick-play': return 'Small-sized games you can play tonight';
      case 'epic-adventure': return 'Massive open-world and story-driven games';
      case 'random-surprise': return 'Random picks just for fun';
      case 'recent-releases': return 'Games from the last 3 months';
      case 'size-specific': return 'Games within your preferred size range';
      default: return 'AI-powered recommendations';
    }
  };

  const getPaginatedGames = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredGames.slice(start, end);
  };

  const handleDownload = async (gameId: number, gameTitle: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game || !game.magnet_link) {
        message.error('Game magnet link not found');
        return;
      }

      setSelectedGameId(gameId);
      setSelectedGameTitle(gameTitle);
      setFileFetching(true);

      try {
        const files = await window.electronAPI.getTorrentFiles(game.magnet_link);
        setTorrentFiles(files);

        const hasOptionalFiles = files.some((f: any) => f.isOptional);
        
        if (hasOptionalFiles) {
          setFileSelectionVisible(true);
        } else {
          await window.electronAPI.startDownload(gameId);
          message.success('Download started!');
        }
      } catch (fileError) {
        console.error('Error fetching torrent files:', fileError);
        await window.electronAPI.startDownload(gameId);
        message.success('Download started!');
      }
    } catch (error) {
      message.error('Failed to start download');
    } finally {
      setFileFetching(false);
    }
  };

  const handleFileSelectionConfirm = async (selectedIndices: number[]) => {
    if (!selectedGameId) return;

    try {
      setFileSelectionVisible(false);
      await window.electronAPI.startDownload(selectedGameId, selectedIndices);
      message.success('Download started!');
    } catch (error) {
      message.error('Failed to start download');
    }
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
      setCurrentPage(1);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenres([]);
    setSizeRange([0, 300]);
    setDateRange('all');
    setCompanySearch('');
  };

  if (loading) {
    return (
      <div className="page-shell" style={{ textAlign: 'center', paddingTop: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  const paginatedGames = getPaginatedGames();

  return (
    <div className="page-shell">
      <AIRecommendationModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSelectOption={handleAIOptionSelect}
      />
      
      <FileSelectionModal
        visible={fileSelectionVisible}
        files={torrentFiles}
        loading={fileFetching}
        gameName={selectedGameTitle}
        onConfirm={handleFileSelectionConfirm}
        onCancel={() => setFileSelectionVisible(false)}
      />

      <div className="hero-bar">
        <div>
          <Title level={2} className="page-title">Browse Games</Title>
          <div className="hero-subtitle">
            Showing {filteredGames.length.toLocaleString()} of {games.length.toLocaleString()} games
          </div>
        </div>
        <Button
          type="primary"
          icon={loadingRecommendations ? <LoadingOutlined /> : <RobotOutlined />}
          onClick={() => setAiModalVisible(true)}
          loading={loadingRecommendations}
          size="large"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            fontWeight: 600,
            height: 44,
            paddingLeft: 24,
            paddingRight: 24
          }}
        >
          AI Recommendations
        </Button>
      </div>

      {/* Search Bar and Sort */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
        <Search
          placeholder="Search by title, company, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={() => applyFilters()}
          style={{ flex: 1, maxWidth: 640 }}
          size="large"
          prefix={<SearchOutlined />}
          allowClear
        />
        <Select
          value={`${sortBy}-${sortOrder}`}
          onChange={(value) => {
            const [newSortBy, newSortOrder] = value.split('-');
            setSortBy(newSortBy);
            setSortOrder(newSortOrder as 'asc' | 'desc');
          }}
          style={{ width: 220 }}
          size="large"
          options={[
            { label: '📅 Newest First', value: 'repack_date-desc' },
            { label: '📅 Oldest First', value: 'repack_date-asc' },
            { label: '🔤 Title (A-Z)', value: 'title-asc' },
            { label: '🔤 Title (Z-A)', value: 'title-desc' },
            { label: '📦 Size (Smallest)', value: 'repack_size_min_mb-asc' },
            { label: '📦 Size (Largest)', value: 'repack_size_min_mb-desc' },
          ]}
        />
      </div>

      {/* Filters Section */}
      <Collapse 
        ghost
        style={{ 
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: 8,
          marginBottom: 24,
          border: '1px solid rgba(148, 163, 184, 0.1)'
        }}
      >
        <Panel 
          header={
            <Space>
              <FilterOutlined />
              <span>Filters</span>
              {(selectedGenres.length > 0 || dateRange !== 'all' || companySearch || sizeRange[0] > 0 || sizeRange[1] < 300) && (
                <Tag color="blue">{
                  [
                    selectedGenres.length > 0 && `${selectedGenres.length} genres`,
                    dateRange !== 'all' && 'date',
                    companySearch && 'company',
                    (sizeRange[0] > 0 || sizeRange[1] < 300) && 'size'
                  ].filter(Boolean).join(', ')
                }</Tag>
              )}
            </Space>
          }
          key="1"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 8, color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                <ClockCircleOutlined /> RELEASE DATE
              </div>
              <Select
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
                options={[
                  { label: 'All Time', value: 'all' },
                  { label: 'Last 7 Days', value: '7d' },
                  { label: 'Last 30 Days', value: '30d' },
                  { label: 'Last 3 Months', value: '3m' },
                  { label: 'Last Year', value: '1y' }
                ]}
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 8, color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                📦 REPACK SIZE (GB)
              </div>
              <Slider
                range
                min={0}
                max={300}
                value={sizeRange}
                onChange={(value) => setSizeRange(value as [number, number])}
                marks={{
                  0: '0',
                  50: '50',
                  100: '100',
                  200: '200',
                  300: '300+'
                }}
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 8, color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                🏢 COMPANY
              </div>
              <Input
                placeholder="Filter by developer/publisher"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 8, color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                🎮 GENRES
              </div>
              <Select
                mode="multiple"
                placeholder="Select genres"
                value={selectedGenres}
                onChange={setSelectedGenres}
                style={{ width: '100%' }}
                maxTagCount={2}
                options={availableGenres.map(g => ({ label: g, value: g }))}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <Space>
            <Button onClick={clearFilters} size="small">
              Clear All Filters
            </Button>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {filteredGames.length !== games.length && `${filteredGames.length} results`}
            </span>
          </Space>
        </Panel>
      </Collapse>

      {/* AI Recommendations Section */}
      {showRecommendations && aiRecommendations.length > 0 && (
        <>
          <div style={{ 
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: 8,
            border: '1px solid rgba(102, 126, 234, 0.2)',
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 700, 
                  color: '#fff',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <RobotOutlined style={{ fontSize: 20, color: '#667eea' }} />
                  {getRecommendationTitle()}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {getRecommendationSubtitle()}
                </div>
              </div>
              <Button 
                type="link" 
                onClick={() => setShowRecommendations(false)}
                style={{ color: '#64748b' }}
              >
                Show All Games
              </Button>
            </div>
          </div>

          {/* AI Recommended Games Grid */}
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            {aiRecommendations.map(game => (
              <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  className="glass-card"
                  style={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderColor: 'rgba(102, 126, 234, 0.4)'
                  }}
                  bodyStyle={{ 
                    padding: '12px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    flex: 1,
                    height: '100%' 
                  }}
                  cover={
                    game.cover_image_url ? (
                      <div style={{ 
                        width: '100%', 
                        height: 240, 
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <img
                          alt={game.title}
                          src={game.cover_image_url}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%231e293b" width="200" height="300"/%3E%3Ctext x="50%" y="50%" font-family="Arial" font-size="14" fill="%2364748b" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    ) : null
                  }
                >
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: '#e2e8f0', 
                    lineHeight: 1.3,
                    marginBottom: 10,
                    height: 36,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {game.title}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 10,
                    height: 20
                  }}>
                    <span style={{ 
                      color: '#3b82f6', 
                      fontWeight: 700,
                      fontSize: 15
                    }}>
                      {game.repack_size_text || `${(game.repack_size_mb / 1024).toFixed(1)} GB`}
                    </span>
                    {game.original_size_mb > 0 && (
                      <span style={{ 
                        color: '#64748b', 
                        fontSize: 11,
                        fontWeight: 500
                      }}>
                        {(game.original_size_mb / 1024).toFixed(0)} GB
                      </span>
                    )}
                  </div>

                  <div style={{ 
                    minHeight: 24, 
                    marginBottom: 10,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4
                  }}>
                    {game.genres.filter(g => g !== 'Unknown').slice(0, 3).map(genre => (
                      <Tag 
                        key={genre} 
                        className="tag-pill" 
                        style={{ 
                          margin: 0, 
                          fontSize: 10,
                          padding: '0 8px',
                          height: 20,
                          lineHeight: '20px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#60a5fa'
                        }}
                      >
                        {genre}
                      </Tag>
                    ))}
                  </div>

                  {game.companies && (
                    <div style={{ 
                      height: 16,
                      fontSize: 11, 
                      color: '#64748b',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 12
                    }}>
                      {game.companies.split(',')[0].trim()}
                    </div>
                  )}

                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(game.id, game.title)}
                    disabled={!game.magnet_link}
                    block
                    style={{
                      height: 40,
                      fontWeight: 600,
                      fontSize: 14,
                      background: game.magnet_link ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
                      border: 'none',
                      borderRadius: 6,
                      boxShadow: game.magnet_link ? '0 4px 12px rgba(102, 126, 234, 0.3)' : undefined
                    }}
                  >
                    Download
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>

          <Divider style={{ margin: '32px 0', borderColor: 'rgba(148, 163, 184, 0.2)' }}>
            <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>
              All Games
            </span>
          </Divider>
        </>
      )}

      {/* Games Grid */}
      <Row gutter={[16, 16]}>
        {paginatedGames.map(game => (
          <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              className="glass-card"
              style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column' 
              }}
              bodyStyle={{ 
                padding: '12px', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              cover={
                <div className="glass-cover" style={{ position: 'relative', height: 240 }}>
                  {game.cover_image_url ? (
                    <img 
                      src={game.cover_image_url} 
                      alt={game.title}
                      style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<div style="display:grid;place-items:center;height:240px;color:#bfe9ff;font-size:48px">🎮</div>';
                        }
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: 'grid', placeItems: 'center', height: 240, color: '#bfe9ff', fontSize: 48 }}>🎮</div>
                  )}
                  {game.repack_date && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.8)',
                      backdropFilter: 'blur(4px)',
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#cbd5e1'
                    }}>
                      {formatDate(game.repack_date)}
                    </div>
                  )}
                </div>
              }
            >
              {/* Title */}
              <div style={{ 
                fontSize: 14, 
                fontWeight: 600,
                color: '#e2e8f0', 
                lineHeight: 1.3,
                marginBottom: 10,
                height: 36,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {game.title}
              </div>

              {/* Size Info */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 10,
                height: 20
              }}>
                <span style={{ 
                  color: '#3b82f6', 
                  fontWeight: 700,
                  fontSize: 15
                }}>
                  {game.repack_size_text || `${(game.repack_size_mb / 1024).toFixed(1)} GB`}
                </span>
                {game.original_size_mb > 0 && (
                  <span style={{ 
                    color: '#64748b', 
                    fontSize: 11,
                    fontWeight: 500
                  }}>
                    {(game.original_size_mb / 1024).toFixed(0)} GB
                  </span>
                )}
              </div>

              {/* Genres - Fixed height */}
              <div style={{ 
                minHeight: 24, 
                marginBottom: 10,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4
              }}>
                {game.genres.filter(g => g !== 'Unknown').slice(0, 3).map(genre => (
                  <Tag 
                    key={genre} 
                    className="tag-pill" 
                    style={{ 
                      margin: 0, 
                      fontSize: 10,
                      padding: '0 8px',
                      height: 20,
                      lineHeight: '20px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa'
                    }}
                  >
                    {genre}
                  </Tag>
                ))}
              </div>

              {/* Company - Fixed height */}
              {game.companies && (
                <div style={{ 
                  height: 16,
                  fontSize: 11, 
                  color: '#64748b',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 12
                }}>
                  {game.companies.split(',')[0].trim()}
                </div>
              )}

              {/* Download Button - Always at bottom */}
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(game.id, game.title)}
                disabled={!game.magnet_link}
                block
                style={{
                  height: 40,
                  fontWeight: 600,
                  fontSize: 14,
                  background: game.magnet_link ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
                  border: 'none',
                  borderRadius: 6,
                  boxShadow: game.magnet_link ? '0 4px 12px rgba(102, 126, 234, 0.3)' : undefined
                }}
              >
                Download
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      {paginatedGames.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 18, marginBottom: 8 }}>No games found</div>
          <div style={{ fontSize: 14 }}>Try adjusting your filters or search terms</div>
          <Button onClick={clearFilters} type="primary" style={{ marginTop: 16 }}>
            Clear All Filters
          </Button>
        </div>
      )}

      {filteredGames.length > pageSize && (
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredGames.length}
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
            showSizeChanger
            pageSizeOptions={[12, 24, 48, 96]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} games`}
          />
        </div>
      )}
    </div>
  );
};

export default BrowseView;
