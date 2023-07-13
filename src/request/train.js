
import axios from "axios"

export const train = (data_matrix) => {
    return axios({
        url: 'api/train',
        method: "POST",
        data: {
            data_matrix,
            n_samples: data_matrix.length,
            input_dims: data_matrix[0].length,
            epoch_nums: 50,
            n_neighbors: 15,
            alpha: 5,
            split_upper: 0.11,
            split_lower: 0.01
        }
    })
}