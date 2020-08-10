import styled from "styled-components";
import PropTypes from "prop-types";

import Logo from "../../../assets/images/logo.svg";

const Wrapper = styled.div`
  background-color: #cbad6d;
  padding-left: 5px;
  height: ${(props) => props.theme.main.sizes.leftMenu.height};

  .leftMenuHeaderLink {
    &:hover {
      text-decoration: none;
    }
  }

  .projectName {
    display: block;
    width: 100%;
    height: ${(props) => props.theme.main.sizes.leftMenu.height};
    font-size: 2rem;
    letter-spacing: 0.2rem;
    color: $white;

    background-image: url(${Logo});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
`;

Wrapper.defaultProps = {
  theme: {
    main: {
      colors: {
        leftMenu: {},
      },
      sizes: {
        header: {},
        leftMenu: {},
      },
    },
  },
};

Wrapper.propTypes = {
  theme: PropTypes.object,
};

export default Wrapper;
