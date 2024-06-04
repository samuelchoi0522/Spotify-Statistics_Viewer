import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { catchErrors } from '../utils';
import { getPlaylistById, getAudioFeaturesForTracks } from '../spotify';
import { TrackList, SectionWrapper, Loader } from '../components';
import { StyledHeader, StyledDropdown } from '../styles';

const Playlist = () => {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [tracksData, setTracksData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [audioFeatures, setAudioFeatures] = useState([]);
  const [sortValue, setSortValue] = useState('');
  const sortOptions = ['danceability', 'tempo', 'energy'];

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await getPlaylistById(id);
      setPlaylist(data);
      setTracksData(data.tracks);
    };

    catchErrors(fetchData());
  }, [id]);

  useEffect(() => {
    const fetchMoreData = async () => {
      if (tracksData && tracksData.next) {
        const { data } = await axios.get(tracksData.next);
        setTracksData(data);
      }
    };

    if (tracksData) {
      // Collect new tracks ensuring no duplicates
      setTracks(prevTracks => {
        const newTracks = tracksData.items.map(item => item.track);
        const allTracks = [...prevTracks, ...newTracks];
        return Array.from(new Set(allTracks.map(track => track.id)))
          .map(id => allTracks.find(track => track.id === id));
      });

      // Fetch more data if available
      catchErrors(fetchMoreData());
    }
  }, [tracksData]);

  useEffect(() => {
    const fetchAudioFeatures = async () => {
      if (tracksData && tracksData.items) {
        const ids = tracksData.items.map(({ track }) => track.id).join(',');
        const { data } = await getAudioFeaturesForTracks(ids);
        setAudioFeatures(prevAudioFeatures => {
          const newAudioFeatures = data.audio_features;
          const allAudioFeatures = [...prevAudioFeatures, ...newAudioFeatures];
          return Array.from(new Set(allAudioFeatures.map(item => item.id)))
            .map(id => allAudioFeatures.find(item => item.id === id));
        });
      }
    };

    if (tracksData) {
      catchErrors(fetchAudioFeatures());
    }
  }, [tracksData]);

  const tracksWithAudioFeatures = useMemo(() => {
    if (!tracks.length || !audioFeatures.length) {
      return [];
    }

    return tracks.map(track => {
      const audioFeaturesObj = audioFeatures.find(item => item && item.id === track.id);
      return { ...track, audio_features: audioFeaturesObj };
    });
  }, [tracks, audioFeatures]);

  const sortedTracks = useMemo(() => {
    if (!tracksWithAudioFeatures.length || !sortValue) {
      return tracksWithAudioFeatures;
    }

    return [...tracksWithAudioFeatures].sort((a, b) => {
      const aFeatures = a.audio_features ? a.audio_features[sortValue] : 0;
      const bFeatures = b.audio_features ? b.audio_features[sortValue] : 0;
      return bFeatures - aFeatures;
    });
  }, [sortValue, tracksWithAudioFeatures]);

  return (
    <>
      {playlist && (
        <>
          <StyledHeader>
            <div className="header__inner">
              {playlist.images.length && playlist.images[0].url && (
                <img className="header__img" src={playlist.images[0].url} alt="Playlist Artwork" />
              )}
              <div>
                <div className="header__overline">Playlist</div>
                <h1 className="header__name">{playlist.name}</h1>
                <p className="header__meta">
                  {playlist.followers.total ? (
                    <span>{playlist.followers.total} {`follower${playlist.followers.total !== 1 ? 's' : ''}`}</span>
                  ) : null}
                  <span>{playlist.tracks.total} {`song${playlist.tracks.total !== 1 ? 's' : ''}`}</span>
                </p>
              </div>
            </div>
          </StyledHeader>

          <main>
            <SectionWrapper title="Playlist" breadcrumb={true}>
                <StyledDropdown active={!!sortValue}>
                    <label className="sr-only" htmlFor="order-select">Sort tracks</label>
                    <select
                    name="track-order"
                    id="order-select"
                    onChange={e => setSortValue(e.target.value)}
                    >
                    <option value="">Sort tracks</option>
                    {sortOptions.map((option, i) => (
                        <option value={option} key={i}>
                        {`${option.charAt(0).toUpperCase()}${option.slice(1)}`}
                        </option>
                    ))}
                    </select>
                </StyledDropdown>
              {sortedTracks ? (
                <TrackList tracks={sortedTracks} />
                ) : (
                <Loader />
              )}
            </SectionWrapper>
          </main>
        </>
      )}
    </>
  );
};

export default Playlist;
