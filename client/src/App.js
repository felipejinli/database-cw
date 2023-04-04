import React, { useEffect, useState } from 'react';
import "./App.css";
import "rsuite/dist/rsuite.min.css";
import { BrowserRouter as Router, Route, Routes, Link, Outlet, useParams } from 'react-router-dom';
import { Nav, Navbar, Header, Content, Container, Checkbox, Button, Panel, Table, Tooltip, Whisper } from 'rsuite';
import UseCase1 from './useCases/1old';
import axios from 'axios';

import AutocompleteSearch from './components/AutocompleteSearch';
import PreviewCountInput from './components/PreviewCountInput';


const useSSE = (url, initialState = {}) => {
  const [data, setData] = useState(initialState);

  useEffect(() => {
    if (!url) return;

    console.log('FJL: creating new EventSource', url);
    const source = new EventSource(url);

    source.onmessage = (event) => {
      console.log('FJL: Entering on message of useSSE');
      const { step, data: eventData } = JSON.parse(event.data);
      setData((prevState) => ({ ...prevState, [step]: eventData }));
    };

    const eventTypes = ['preview_ratings', 'cosine_similarity', 'predicted_rating', 'overall_prediction'];

    eventTypes.forEach((eventType) => {
      source.addEventListener(eventType, (event) => {
        console.log(`Received ${eventType} SSE`);
        const { step, data: eventData } = JSON.parse(event.data);
        console.log('SSE data: ', step, eventData);
        setData((prevState) => ({ ...prevState, [step]: eventData }));
      });
    });


    source.onerror = (err) => {
      console.error('SSE error: ', err);
      source.close();
    };

    return () => {
      source.close();
    };
  }, [url]);

  return data;
};

const Home = () => {
  return <div>Welcome to the Movie App!</div>;
};


const UseCase2 = () => {
  return <div>Use Case 2: Searching for information on a specific film</div>;
};

const UseCase3 = () => {
  return <div>Use Case 3: Analysis of viewers' reaction to a film</div>;
};

const UseCase4 = () => {
  return <div>Use Case 4: Tag data analysis</div>;
};

const UseCase5 = () => {
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [numPreviewAudience, setNumPreviewAudience] = useState(null);
  const [overallPredictedRating, setOverallPredictedRating] = useState(null);
  const [tablesData, setTablesData] = useState({ predictedRating: [], previewRatings: [], cosineSimilarity: [] });
  const [showSteps, setShowSteps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sseUrl, setSseUrl] = useState(null);

  const sseData = useSSE(sseUrl);

  const fetchPredictedRating = () => {
    if (!selectedMovieId || !numPreviewAudience) return;
    setLoading(true);

    if (showSteps) {
      setSseUrl(`http://localhost:80/api/movies/${selectedMovieId}/predicted-rating-with-steps/${numPreviewAudience}`);
    } else {
      (async () => {
        try {
          const res = await axios.get(`http://localhost:80/api/movies/${selectedMovieId}/predicted-rating/${numPreviewAudience}`);
          setOverallPredictedRating(res.data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      })();
    }
  };


  const handleShowStepsChange = (value, checked, event) => {
    setShowSteps(checked);
  };


  const renderTable = (title, data, columns) => {
    if (!showSteps || !data) return null;

    return (
      <div style={{ flex: 1, height: '100%', backgroundColor: 'lightgray' }}>
        <h3>{title}</h3>
        <Table virtualized bordered cellBordered data={data} height={800}>
          {columns.map(column => (
            <Table.Column width={130} align="center" key={column.dataKey}>
              <Table.HeaderCell>{column.header}</Table.HeaderCell>
              <Table.Cell dataKey={column.dataKey} />
            </Table.Column>
          ))}
        </Table>
      </div>
    );
  };


  useEffect(() => {
    if (sseData) {
      setTablesData({
        previewRatings: sseData.preview_ratings || [],
        cosineSimilarity: sseData.cosine_similarity || [],
        predictedRating: sseData.predicted_rating || [],
      });
      if (sseData.overall_prediction) {
        console.log('FJL: setting overall prediction', sseData.overall_prediction);
        setOverallPredictedRating(sseData.overall_prediction[0] || null);
        setLoading(false);
      }
    }
  }, [sseData]);

  return (
    <div className="App">
      <h1>Use Case 5: predicted film ratings based on preview</h1>
      <AutocompleteSearch onMovieSelect={setSelectedMovieId} />
      <PreviewCountInput movieId={selectedMovieId} onPreviewCountChange={setNumPreviewAudience} />
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <Checkbox checked={showSteps} onChange={handleShowStepsChange} />
        <Whisper placement="top" trigger="hover" speaker={<Tooltip> Showing query steps is slower since it runs temporary tables rather than CTE.</Tooltip>}>
          <p>Show intermediate query steps (slower)</p>
        </Whisper >
      </div>
      <Button
        appearance="primary"
        onClick={fetchPredictedRating}
        disabled={!selectedMovieId || !numPreviewAudience || loading}
      >
        {loading ? 'Loading...' : 'Search'}
      </Button>
      {
        overallPredictedRating && (
          <Panel header={<h3>Predicted average broader audience rating</h3>} bordered>
            <p>Average: {overallPredictedRating['Predicted average broader audience rating']}</p>
            <p>Standard Deviation: {overallPredictedRating['stddev']}</p>
          </Panel>
        )
      }
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'space-between', backgroundColor: 'yellow' }}>
        {renderTable('Preview Ratings', tablesData.previewRatings, [
          { header: 'User ID', dataKey: 'userid' },
          { header: 'Movie ID', dataKey: 'movieid' },
          { header: 'Rating', dataKey: 'rating' },
          { header: 'Centered Rating', dataKey: 'centered_rating' },
        ])}

        {renderTable('Cosine Similarity', tablesData.cosineSimilarity, [
          { header: 'Preview User', dataKey: 'preview_user' },
          { header: 'Broader User', dataKey: 'broader_user' },
          { header: 'Similarity', dataKey: 'similarity' },
          { header: 'Rank (Most similar)', dataKey: 'rank' },
        ])}

        {renderTable('Predicted Rating', tablesData.predictedRating, [
          { header: 'Broader User', dataKey: 'broader_user' },
          { header: 'Predicted Rating', dataKey: 'predicted_rating' },
        ])}
      </div>
    </div >
  );
};

const UseCase6 = () => {
  return <div>Use Case 6: Analysing the personality traits of viewers</div>;
};

function App() {
  const NavLink = React.forwardRef(({ href, children, ...rest }, ref) => (
    <Link ref={ref} to={href} {...rest}>
      {children}
    </Link>
  ));

  return (
    <Router>
      <div className="App">
        <Header>
          <Navbar>
            <Navbar.Brand as={NavLink} children={<Home />} href="/">
              Movielens Coursework
            </Navbar.Brand>
            <Nav>
              <Nav.Item as={NavLink} children={<UseCase1 />} href="/UseCase1">
                Use Case 1
              </Nav.Item>
              <Nav.Item as={NavLink} children={<UseCase1 />} href="/UseCase2">
                Use Case 2
              </Nav.Item>
              <Nav.Item as={NavLink} children={<UseCase1 />} href="/UseCase3">
                Use Case 3
              </Nav.Item>
              <Nav.Item as={NavLink} children={<UseCase1 />} href="/UseCase4">
                Use Case 4
              </Nav.Item>
              <Nav.Item as={NavLink} children={<UseCase1 />} href="/UseCase5">
                Use Case 5
              </Nav.Item>
              <Nav.Item as={NavLink} children={<UseCase1 />} href="/UseCase6">
                Use Case 6
              </Nav.Item>
            </Nav>
          </Navbar>
        </Header>
        <Content>
          <Routes>
            <Route exact path="/" element={<Home />} />
            <Route exact path="/UseCase1" element={<UseCase1 />} />
            <Route exact path="/UseCase2" element={<UseCase2 />} />
            <Route exact path="/UseCase3" element={<UseCase3 />} />
            <Route exact path="/UseCase4" element={<UseCase4 />} />
            <Route exact path="/UseCase5" element={<UseCase5 />} />
            <Route exact path="/UseCase6" element={<UseCase6 />} />
          </Routes>
        </Content>
      </div>
    </Router>
  );
}

export default App;