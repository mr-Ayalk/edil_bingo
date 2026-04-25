// exports.checkCard = (req, res) => {
//   const { cardNumbers, drawnNumbers } = req.body;

//   if (!cardNumbers || !drawnNumbers) {
//     return res
//       .status(400)
//       .json({ error: "Card numbers and drawn numbers are required." });
//   }

//   // Define the 5x5 card grid, where the center is a free space
//   const cardGrid = [
//     [
//       cardNumbers[0],
//       cardNumbers[1],
//       cardNumbers[2],
//       cardNumbers[3],
//       cardNumbers[4],
//     ], // Row 1
//     [
//       cardNumbers[5],
//       cardNumbers[6],
//       cardNumbers[7],
//       cardNumbers[8],
//       cardNumbers[9],
//     ], // Row 2
//     [
//       cardNumbers[10],
//       cardNumbers[11],
//       "free",
//       cardNumbers[12],
//       cardNumbers[13],
//     ], // Row 3 (center is free)
//     [
//       cardNumbers[14],
//       cardNumbers[15],
//       cardNumbers[16],
//       cardNumbers[17],
//       cardNumbers[18],
//     ], // Row 4
//     [
//       cardNumbers[19],
//       cardNumbers[20],
//       cardNumbers[21],
//       cardNumbers[22],
//       cardNumbers[23],
//     ], // Row 5
//   ];

//   const freeSpaceRow = 2; // Middle row index
//   const freeSpaceCol = 2; // Middle column index

//   // Check horizontal wins (consider center 'free' space as automatically drawn)
//   const checkHorizontalWins = () => {
//     return cardGrid.reduce((count, row, rowIndex) => {
//       if (
//         row.every(
//           (num, colIndex) =>
//             colIndex === freeSpaceCol || drawnNumbers.includes(num)
//         )
//       ) {
//         count++;
//       }
//       return count;
//     }, 0);
//   };

//   // Check vertical wins (consider center 'free' space as automatically drawn)
//   const checkVerticalWins = () => {
//     return cardGrid[0].reduce((count, _, colIndex) => {
//       if (
//         cardGrid.every(
//           (row, rowIndex) =>
//             rowIndex === freeSpaceRow || drawnNumbers.includes(row[colIndex])
//         )
//       ) {
//         count++;
//       }
//       return count;
//     }, 0);
//   };

//   // Check diagonal wins (consider center 'free' space as automatically drawn)
//   const checkDiagonalWins = () => {
//     let diagonalWinCount = 0;

//     // Left-top to bottom-right diagonal
//     const isDiagonalWin1 = cardGrid.every((row, rowIndex) => {
//       if (rowIndex === freeSpaceRow && freeSpaceCol === rowIndex) return true; // Treat center as drawn
//       return drawnNumbers.includes(row[rowIndex]);
//     });

//     // Right-top to bottom-left diagonal
//     const isDiagonalWin2 = cardGrid.every((row, rowIndex) => {
//       const reverseIndex = cardGrid.length - rowIndex - 1;
//       if (rowIndex === freeSpaceRow && reverseIndex === freeSpaceCol)
//         return true; // Treat center as drawn
//       return drawnNumbers.includes(row[reverseIndex]);
//     });

//     if (isDiagonalWin1) diagonalWinCount++;
//     if (isDiagonalWin2) diagonalWinCount++;

//     return diagonalWinCount;
//   };

//   // Check 4 Corners win
//   const isFourCornersWin =
//     drawnNumbers.includes(cardGrid[0][0]) && // Top-left corner
//     drawnNumbers.includes(cardGrid[0][4]) && // Top-right corner
//     drawnNumbers.includes(cardGrid[4][0]) && // Bottom-left corner
//     drawnNumbers.includes(cardGrid[4][4]); // Bottom-right corner

//   // Calculate the total number of line wins for each type
//   const horizontalWins = checkHorizontalWins();
//   const verticalWins = checkVerticalWins();
//   const diagonalWins = checkDiagonalWins();

//   let winMessages = [];

//   // Add each win type and count to the message array
//   if (horizontalWins > 0)
//     winMessages.push(`${horizontalWins} Horizontal Win(s)`);
//   if (verticalWins > 0) winMessages.push(`${verticalWins} Vertical Win(s)`);
//   if (diagonalWins > 0) winMessages.push(`${diagonalWins} Diagonal Win(s)`);
//   if (isFourCornersWin) winMessages.push("Four Corners Win");

//   // Check if full card win
//   const isFullCardWin = cardGrid
//     .flat()
//     .every((num, index) => num === "free" || drawnNumbers.includes(num));

//   if (isFullCardWin) {
//     winMessages.push("Full Card Win");
//   }

//   // Return the result of the Bingo check
//   if (winMessages.length > 0) {
//     return res.status(200).json({ message: "Bingo!!!", winTypes: winMessages });
//   } else {
//     return res.status(200).json({ message: "No win yet." });
//   }
// };
