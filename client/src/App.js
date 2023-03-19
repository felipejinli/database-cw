import React from 'react';
import "./App.css";
import "rsuite/dist/rsuite.min.css";
import { BrowserRouter as Router, Route, Routes, Link, Outlet, useParams } from 'react-router-dom';
import { Nav, Navbar, Header, Content, Container } from 'rsuite';
import UseCase1 from './useCases/1old';

import { useEffect, useState } from 'react';


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
  return <div>Use Case 5: Predicting how a film will be rated</div>;
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