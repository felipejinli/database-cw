import React, { useState, useEffect } from "react";
import { SelectPicker, TagPicker, Table, RangeSlider } from "rsuite";
import { Form, Button } from "rsuite";
import axios from "axios";
import "./1old.css";

const { Column, HeaderCell, Cell } = Table;

function UseCase1() {
  const min_year = parseInt("1900");
  const max_year = parseInt("2023");
  const [Results, setResults] = useState([]);
  const [UniqueGenres, setUniqueGenres] = useState([]);
  const [PickedTitle, setPickedTitle] = useState("");
  const [YearRange, setYearRange] = useState([min_year, max_year]);
  const [PickedGenres, setPickedGenres] = useState([]);
  const [PickedOrder, setPickedOrder] = useState("Year Descending");
  const [isLoading, setIsLoading] = useState(true);

  const orders = ["Rating Ascending", "Rating Descending", "Year Ascending", "Year Descending"].map((item) => ({
    label: item,
    value: item,
  }));


  const yearOptions = [];
  for (let year = max_year; year >= min_year; year--) {
    yearOptions.push({ value: year, label: year.toString() });
  }

  const checkDatabaseInit = async () => {
    const response = await fetch('/api/checkInit');
    const { isInitialized } = await response.json();
    return isInitialized;
  };

  useEffect(() => {
    const fetchData = async () => {
      const isInitialized = await checkDatabaseInit();
      if (!isInitialized) {
        setTimeout(fetchData, 1000); // Retry every second
        return;
      }

      setIsLoading(false);

      axios
        .get("/api/usecase1", {
          params: {
            title: PickedTitle,
            minYear: YearRange[0],
            year: YearRange[1],
            genres: PickedGenres,
            order: PickedOrder
          }
        })
        .then((results) => {
          setResults(results.data);
        });

      axios.get('/api/genres/unique').then((results) => {
        setUniqueGenres(results.data);
      });
    };

    fetchData();
  }, []);

  const unique_genres = UniqueGenres.map((item) => ({
    label: item.genre,
    value: item.genre,
  }));

  function handleYearRangeChange(value) {
    setYearRange(value);
  }


  function handleTitleChange(value) {
    setPickedTitle(value);
  }

  function handleGenresChange(value) {
    setPickedGenres(value);
  }

  function handleOrderChange(value) {
    setPickedOrder(value);
  }

  function handleSubmit() {
    axios
      .get("/api/usecase1", {
        params: {
          title: PickedTitle,
          minYear: YearRange[0],
          year: YearRange[1],
          genres: PickedGenres,
          order: PickedOrder,
        },
      })
      .then((results) => {
        setResults(results.data);
      });
  }

  return (
    <>
      <h1> use case 1 page</h1>
      <Form layout="inline">
        <Form.Group controlId="title">
          <Form.ControlLabel>Title</Form.ControlLabel>
          <Form.Control
            name="title"
            style={{ width: 240 }}
            value={PickedTitle}
            onChange={handleTitleChange}
          />
        </Form.Group>

        <Form.Group controlId="GenretagPicker">
          <Form.ControlLabel>Genre</Form.ControlLabel>
          <Form.Control
            name="genre"
            accepter={TagPicker}
            data={unique_genres}
            value={PickedGenres}
            onChange={handleGenresChange}
          />
        </Form.Group>

        <Form.Group controlId="selectPicker">
          <Form.ControlLabel>Order</Form.ControlLabel>
          <Form.Control
            name="selectPicker"
            accepter={SelectPicker}
            data={orders}
            value={PickedOrder}
            onChange={handleOrderChange}
          />
        </Form.Group>
        <Button appearance="primary" onClick={handleSubmit}>
          Search
        </Button>
      </Form>
      <div className="center-container">
        <Form.ControlLabel className="year-range-label">Year Range</Form.ControlLabel>
        <div className="range-slider">
          <RangeSlider
            min={min_year}
            max={max_year}
            value={YearRange}
            onChange={handleYearRangeChange}
            tooltip={true}
            graduated={false}
            progress={true}
          />
        </div>
      </div>
      <hr />

      <div className="table-container" >

        {isLoading ? (<div className="loader">Loading...</div>) : (
          <Table virtualized height={1000} data={Results} bordered cellBordered>
            <Column width={150} align="center" fullText flexGrow={1}>
              <HeaderCell>Title</HeaderCell>
              <Cell dataKey="title" />
            </Column>

            <Column width={200} align="center" fullText flexGrow={1}>
              <HeaderCell>Year</HeaderCell>
              <Cell dataKey="year" />
            </Column>

            <Column width={200} align="center" fullText flexGrow={1}>
              <HeaderCell>Avg. Rating</HeaderCell>
              <Cell dataKey="avg_rating" />
            </Column>

            <Column width={200} align="center" fullText flexGrow={1}>
              <HeaderCell>Genres</HeaderCell>
              <Cell dataKey="genres_list" />
            </Column>
          </Table>
        )}
      </div>
    </>
  );
}

export default UseCase1;
