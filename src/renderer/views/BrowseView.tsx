import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Button, Input, Space, Tag, message, Spin, Pagination, Select, Slider, Collapse, Divider } from 'antd';
import { DownloadOutlined, SearchOutlined, FilterOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Game } from '../../shared/types';
import FileSelectionModal from '../components/FileSelectionModal';

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
  
  // Filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sizeRange, setSizeRange] = useState<[number, number]>([0, 300]);
  const [dateRange, setDateRange] = useState<string>('all');
  const [companySearch, setCompanySearch] = useState('');
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  
  const [fileSelectionVisible, setFileSelectionVisible] = useState(false);
  const [torrentFiles, setTorrentFiles] = useState<any[]>([]);
  const [fileFetching, setFileFetching] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameTitle, setSelectedGameTitle] = useState('');

  useEffect(() => {
    loadAllGames();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [games, searchTerm, selectedGenres, sizeRange, dateRange, companySearch]);

  const loadAllGames = async () => {
    setLoading(true);
    try {
      // Load all games for filtering
      const data = await window.electronAPI.getGames(10000, 0);
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
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 24 }}>
        <Search
          placeholder="Search by title, company, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={() => applyFilters()}
          style={{ maxWidth: 640 }}
          size="large"
          prefix={<SearchOutlined />}
          allowClear
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

      {/* Games Grid */}
      <Row gutter={[16, 16]}>
        {paginatedGames.map(game => (
          <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              className="glass-card"
              cover={
                <div className="glass-cover" style={{ position: 'relative' }}>
                  {game.cover_image_url ? (
                    <img 
                      src={game.cover_image_url} 
                      alt={game.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:#bfe9ff;font-size:32px">🎮</div>';
                        }
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#bfe9ff', fontSize: 32 }}>🎮</div>
                  )}
                  {game.repack_date && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.7)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      color: '#94a3b8'
                    }}>
                      {formatDate(game.repack_date)}
                    </div>
                  )}
                </div>
              }
              actions={[
                <Button
                  key="download"
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(game.id, game.title)}
                  disabled={!game.magnet_link}
                  block
                >
                  Download
                </Button>
              ]}
            >
              <Card.Meta
                title={
                  <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.4 }}>
                    {game.title}
                  </div>
                }
                description={
                  <div className="card-meta">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                        {game.repack_size_text || `${(game.repack_size_mb / 1024).toFixed(1)} GB`}
                      </span>
                      {game.original_size_mb > 0 && (
                        <span style={{ color: '#64748b', fontSize: 11 }}>
                          {(game.original_size_mb / 1024).toFixed(0)} GB
                        </span>
                      )}
                    </div>
                    <Space wrap style={{ marginTop: 8 }}>
                      {game.genres.filter(g => g !== 'Unknown').slice(0, 3).map(genre => (
                        <Tag key={genre} className="tag-pill" style={{ margin: 0, fontSize: 10 }}>
                          {genre}
                        </Tag>
                      ))}
                    </Space>
                    {game.companies && (
                      <div style={{ 
                        marginTop: 8, 
                        fontSize: 11, 
                        color: '#64748b', 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {game.companies.split(',')[0].trim()}
                      </div>
                    )}
                  </div>
                }
              />
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
