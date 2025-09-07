import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const protectArtist = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.artist = decoded.id;
      next();
    } catch (error) {
      console.error('Error in authentication middleware:', error);
      res.status(401).json({ error: 'Not authorized, token failed.' });
    }
  }
  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token.' });
  }
};

export const protectClient = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.client = decoded.id;
      next();
    } catch (error) {
      console.error('Error in authentication middleware:', error);
      res.status(401).json({ error: 'Not authorized, token failed.' });
    }
  }
  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token.' });
  }
};

export const protectAdmin = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'admin') {
        req.admin = decoded.id;
        req.user = { id: decoded.id }; // Set req.user.id for compatibility with existing code
        next();
      } else {
        res.status(403).json({ error: 'Access denied. Admin role required.' });
      }
    } catch (error) {
      console.error('Error in admin authentication middleware:', error);
      res.status(401).json({ error: 'Not authorized, token failed.' });
    }
  }
  if (!token) {
    res.status(401).json({ error: 'Not authorized, no token.' });
  }
};