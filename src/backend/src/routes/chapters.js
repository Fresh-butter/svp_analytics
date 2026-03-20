const { Router } = require('express');
const { ChapterRepository } = require('../repositories');

const router = Router();

router.get('/', async (_req, res) => {
  // #swagger.tags = ['Chapters']
  // #swagger.summary = 'List all chapters'
  // #swagger.description = 'Returns a list of all chapters.'
  /* #swagger.responses[200] = {
       description: 'List of chapters',
       content: {
         "application/json": {
           schema: {
             type: 'object',
             properties: {
               success: { type: 'boolean', example: true },
               data: { type: 'array', items: { type: 'object' } }
             }
           }
         }
       }
     } */
  /* #swagger.responses[500] = {
       description: 'Internal server error'
     } */
  try {
    const chapters = await ChapterRepository.findAll();
    res.json({ success: true, data: chapters });
  } catch (err) {
    console.error('List chapters error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chapters' } });
  }
});

router.get('/:id', async (req, res) => {
  // #swagger.tags = ['Chapters']
  // #swagger.summary = 'Get a chapter by ID'
  // #swagger.description = 'Returns a single chapter by its UUID.'
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Chapter UUID'
     } */
  /* #swagger.responses[200] = {
       description: 'Chapter found'
     } */
  /* #swagger.responses[404] = {
       description: 'Chapter not found'
     } */
  /* #swagger.responses[500] = {
       description: 'Internal server error'
     } */
  try {
    const chapter = await ChapterRepository.findById(req.params.id);
    if (!chapter) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chapter not found' } });
      return;
    }
    res.json({ success: true, data: chapter });
  } catch (err) {
    console.error('Get chapter error:', err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chapter' } });
  }
});

module.exports = router;
